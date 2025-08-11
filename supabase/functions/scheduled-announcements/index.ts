import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the AUTH_SUPABASE_URL and AUTH_SUPABASE_ANON_KEY env vars
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );
    
    // Get the current time
    const now = new Date();
    
    // Fetch scheduled announcements that are due to be sent
    const { data: scheduledAnnouncements, error: fetchError } = await supabaseClient
      .from('announcements')
      .select('id, bot_id, title, description, image_url, scheduled_time, total_count')
      .eq('status', 'scheduled')
      .lte('scheduled_time', now.toISOString())
      .order('scheduled_time', { ascending: true });
      
    if (fetchError) {
      throw fetchError;
    }
    
    console.log(`Found ${scheduledAnnouncements?.length || 0} scheduled announcements to process`);
    
    if (!scheduledAnnouncements || scheduledAnnouncements.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No scheduled announcements due for sending' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }
    
    // Process each scheduled announcement
    const results = await Promise.all(
      scheduledAnnouncements.map(async (announcement) => {
        try {
          // Get the bot token
          const { data: bot, error: botError } = await supabaseClient
            .from('bots')
            .select('token')
            .eq('id', announcement.bot_id)
            .single();
            
          if (botError || !bot) {
            throw new Error(`Failed to fetch bot token: ${botError?.message || 'Bot not found'}`);
          }
          
          // Mark announcement as sending
          await supabaseClient
            .from('announcements')
            .update({ status: 'sending' })
            .eq('id', announcement.id);
          
          // Get subscribers for this bot
          const { data: subscribers, error: subscribersError } = await supabaseClient
            .from('subscribers')
            .select('telegram_id')
            .eq('bot_id', announcement.bot_id)
            .eq('is_blocked', false);
            
          if (subscribersError) {
            throw new Error(`Failed to fetch subscribers: ${subscribersError.message}`);
          }
          
          // If no subscribers, mark as sent with 0 delivered
          if (!subscribers || subscribers.length === 0) {
            await supabaseClient
              .from('announcements')
              .update({
                status: 'sent',
                sent_at: new Date().toISOString(),
                delivered_count: 0
              })
              .eq('id', announcement.id);
              
            return {
              id: announcement.id,
              success: true,
              message: 'No active subscribers to send to'
            };
          }
          
          // Send the announcement to all subscribers
          let deliveredCount = 0;
          const botToken = bot.token;
          const messageText = `<b>${announcement.title}</b>\n\n${announcement.description}`;
          
          // Send in batches to avoid rate limits
          const batchSize = 25;
          const subscriberBatches = [];
          
          for (let i = 0; i < subscribers.length; i += batchSize) {
            subscriberBatches.push(subscribers.slice(i, i + batchSize));
          }
          
          for (const batch of subscriberBatches) {
            const sendPromises = batch.map(async (subscriber) => {
              try {
                // Send message with or without image
                let response;
                
                if (announcement.image_url) {
                  // Send photo message
                  response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      chat_id: subscriber.telegram_id,
                      photo: announcement.image_url,
                      caption: messageText,
                      parse_mode: 'HTML'
                    })
                  });
                } else {
                  // Send text message
                  response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      chat_id: subscriber.telegram_id,
                      text: messageText,
                      parse_mode: 'HTML'
                    })
                  });
                }
                
                const result = await response.json();
                
                if (result.ok) {
                  deliveredCount++;
                  return true;
                } else {
                  console.error('Message sending error:', result);
                  return false;
                }
              } catch (error) {
                console.error('Telegram API error:', error);
                return false;
              }
            });
            
            await Promise.all(sendPromises);
            
            // Add a small delay between batches to avoid rate limits
            if (subscriberBatches.length > 1) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            // Update the delivery count periodically
            await supabaseClient
              .from('announcements')
              .update({ delivered_count: deliveredCount })
              .eq('id', announcement.id);
          }
          
          // Update the announcement as sent
          const finalStatus = deliveredCount > 0 ? 'sent' : 'failed';
          
          await supabaseClient
            .from('announcements')
            .update({
              status: finalStatus,
              sent_at: new Date().toISOString(),
              delivered_count: deliveredCount
            })
            .eq('id', announcement.id);
            
          return {
            id: announcement.id,
            success: true,
            delivered: deliveredCount,
            total: subscribers.length,
            status: finalStatus
          };
        } catch (error) {
          console.error(`Error processing announcement ${announcement.id}:`, error);
          
          // Mark the announcement as failed
          await supabaseClient
            .from('announcements')
            .update({
              status: 'failed',
              sent_at: new Date().toISOString()
            })
            .eq('id', announcement.id);
            
          return {
            id: announcement.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );
    
    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error processing scheduled announcements:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
}); 