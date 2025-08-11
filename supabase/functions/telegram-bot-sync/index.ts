import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const botId = url.searchParams.get("botId");

    if (!botId) {
      return new Response(JSON.stringify({ error: "Bot ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: "Supabase environment variables are missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Bot bilgilerini alın
    const { data: botData, error: botError } = await supabase
      .from("bots")
      .select("token, name")
      .eq("id", botId)
      .single();

    if (botError || !botData) {
      return new Response(JSON.stringify({ error: "Bot not found", details: botError?.message }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const botToken = botData.token;
    const results = {
      botInfo: null,
      userCount: 0,
      groupCount: 0,
      updatedUsers: 0,
      newUsers: 0,
      updatedGroups: 0,
      newGroups: 0,
      errors: []
    };
    
    // 1. Bot bilgilerini doğrula
    const botInfoResponse = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const botInfoData = await botInfoResponse.json();
    
    if (!botInfoData.ok) {
      return new Response(JSON.stringify({ 
        error: "Invalid bot token", 
        details: botInfoData 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    results.botInfo = botInfoData.result;
    
    // 2. Gruplara dair bilgileri al
    const chatUpdatesResponse = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?limit=100`);
    const chatUpdatesData = await chatUpdatesResponse.json();
    
    if (!chatUpdatesData.ok) {
      results.errors.push(`Telegram updates error: ${chatUpdatesData.description || 'Unknown error'}`);
    } else {
      // Process groups from updates
      const chatIds = new Set<number>();
      const groupsToUpdate: any[] = [];
      
      if (chatUpdatesData.result && chatUpdatesData.result.length > 0) {
        for (const update of chatUpdatesData.result) {
          const chat = update.message?.chat || 
                       update.edited_message?.chat || 
                       update.callback_query?.message?.chat;
          
          if (chat && (chat.type === 'group' || chat.type === 'supergroup') && !chatIds.has(chat.id)) {
            chatIds.add(chat.id);
            groupsToUpdate.push({
              id: chat.id,
              title: chat.title,
              type: chat.type
            });
          }
        }
      }
      
      results.groupCount = groupsToUpdate.length;
      
      // 3. Her grup için detaylı bilgileri al ve veritabanını güncelle
      const nowTimestamp = new Date().toISOString();
      
      for (const group of groupsToUpdate) {
        try {
          // Grup üye sayısını alabilmek için getChatMembersCount API'sini kullan
          const membersCountResponse = await fetch(
            `https://api.telegram.org/bot${botToken}/getChatMemberCount?chat_id=${group.id}`
          );
          const membersCountData = await membersCountResponse.json();
          
          let memberCount = 0;
          if (membersCountData.ok) {
            memberCount = membersCountData.result;
          }
          
          // Grup zaten var mı kontrol et
          const { data: existingGroup } = await supabase
            .from('groups')
            .select('id')
            .eq('telegram_id', group.id)
            .eq('bot_id', botId)
            .single();
            
          const groupData = {
            telegram_id: group.id,
            title: group.title,
            type: group.type,
            member_count: memberCount,
            last_active: nowTimestamp,
            bot_id: botId,
          };

          if (existingGroup) {
            // Grubu güncelle
            await supabase
              .from('groups')
              .update(groupData)
              .eq('id', existingGroup.id);
            results.updatedGroups++;
          } else {
            // Yeni grup ekle
            await supabase
              .from('groups')
              .insert({
                ...groupData,
                joined_at: nowTimestamp,
              });
            results.newGroups++;
          }
        } catch (err) {
          results.errors.push(`Error processing group ${group.id}: ${err.message}`);
        }
      }
    }
    
    // 4. Aboneleri al
    try {
      // getChat ve getChatMember kullanarak özel chatler için kullanıcı bilgilerini al
      const getUpdatesResponse = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?limit=100`);
      const updates = await getUpdatesResponse.json();
      
      if (updates.ok && updates.result) {
        const processedUsers = new Set<number>();
        
        for (const update of updates.result) {
          if (update.message?.chat?.type === "private" && !processedUsers.has(update.message.from.id)) {
            const userId = update.message.from.id;
            processedUsers.add(userId);
            
            const subscriber = {
              telegram_id: userId,
              username: update.message.from.username || "",
              first_name: update.message.from.first_name,
              last_name: update.message.from.last_name || null,
              is_blocked: false,
              last_active: new Date().toISOString(),
              bot_id: botId
            };
            
            // Kullanıcı zaten var mı kontrol et
            const { data: existingSubscriber } = await supabase
              .from("subscribers")
              .select("id")
              .eq("telegram_id", subscriber.telegram_id)
              .eq("bot_id", botId)
              .single();
            
            if (!existingSubscriber) {
              await supabase.from("subscribers").insert({
                ...subscriber,
                joined_at: new Date().toISOString()
              });
              results.newUsers++;
            } else {
              await supabase
                .from("subscribers")
                .update({ 
                  username: subscriber.username,
                  first_name: subscriber.first_name,
                  last_name: subscriber.last_name,
                  last_active: subscriber.last_active,
                  is_blocked: false
                })
                .eq("telegram_id", subscriber.telegram_id)
                .eq("bot_id", botId);
              results.updatedUsers++;
            }
          }
        }
        
        results.userCount = processedUsers.size;
      }
    } catch (err) {
      results.errors.push(`Error processing subscribers: ${err.message}`);
    }
    
    // 5. Son olarak bot bilgilerini güncelle
    try {
      const { count: subscribersCount } = await supabase
        .from('subscribers')
        .select('id', { count: 'exact', head: true })
        .eq('bot_id', botId)
        .eq('is_blocked', false);

      await supabase
        .from('bots')
        .update({
          subscribers_count: subscribersCount || 0,
          last_active: new Date().toISOString(),
        })
        .eq('id', botId);
    } catch (err) {
      results.errors.push(`Error updating bot stats: ${err.message}`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Bot data synchronized successfully",
      results 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    
  } catch (err) {
    console.error("Sync error:", err);
    
    return new Response(JSON.stringify({ 
      error: "Failed to sync bot data", 
      message: err.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

Deno.serve(handler); 