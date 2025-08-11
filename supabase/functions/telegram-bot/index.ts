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
    
    const telegramBotInfo = botInfoData.result;
    console.log(`Activating bot @${telegramBotInfo.username}`);

    // 2. Tüm bekleyen güncellemeleri temizle (isteğe bağlı)
    await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?offset=-1&limit=1`);
    
    // 3. Bot komutlarını ayarla - özellikle kullanıcı kaydetmek ve toplu mesaj göndermek için
    const setCommandsResponse = await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        commands: [
          {
            command: "start",
            description: "Botu başlat ve kaydol"
          },
          {
            command: "help",
            description: "Yardım ve bilgi al"
          }
        ]
      })
    });
    
    // 4. Long polling başlat - Edge Function webhook kurarak yapabiliriz
    // Bu uygulama için sadece manuel olarak botu aktif ediyoruz
    
    // 5. Test mesajı gönder - bot sahibine
    try {
      const ownerNotification = `✅ <b>${botData.name}</b> botu başarıyla aktif edildi!\n\n` +
        `<b>Bot Bilgileri:</b>\n` +
        `Kullanıcı adı: @${telegramBotInfo.username}\n` +
        `ID: ${telegramBotInfo.id}\n\n` +
        `Bot şu anda kullanıcı mesajlarını kabul ediyor ve kullanıcıları otomatik kaydediyor.\n` +
        `Toplu mesaj göndermek için yönetici panelini kullanabilirsiniz.`;
      
      // Bot yöneticisine mesaj gönder (isteğe bağlı)
      // Bu örnek, son güncellemeyi yapan kişiye mesaj gönderir, daha iyi bir yöntem botun sahibine mesaj göndermektir
      const getUpdatesResponse = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?limit=10`);
      const updates = await getUpdatesResponse.json();
      
      if (updates.ok && updates.result && updates.result.length > 0) {
        // En son konuşan kişiye bot sahibi olarak davran ve bilgilendir
        for (const update of updates.result) {
          if (update.message?.chat?.type === "private") {
            const chatId = update.message.chat.id;
            
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                chat_id: chatId,
                text: ownerNotification,
                parse_mode: "HTML"
              })
            });
            
            break; // Sadece en son kişiye gönder
          }
        }
      }
    } catch (notificationError) {
      console.error("Owner notification failed:", notificationError);
    }
    
    // 6. Botun otomatik mesaj yanıtlarını ayarla
    // Bu bir webhook kullanarak daha iyi yapılır, ama örnek için getUpdates kullanıyoruz
    try {
      setInterval(async () => {
        try {
          // Son mesajları kontrol et
          const getUpdatesResponse = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?limit=5&timeout=30`);
          const updates = await getUpdatesResponse.json();
          
          if (updates.ok && updates.result && updates.result.length > 0) {
            // Son güncelleme ID'sini takip et
            let lastUpdateId = 0;
            
            for (const update of updates.result) {
              // Update ID'sini güncelle
              if (update.update_id > lastUpdateId) {
                lastUpdateId = update.update_id;
              }
              
              // Sadece yeni mesajları işle
              if (update.message && update.message.text) {
                const chatId = update.message.chat.id;
                const text = update.message.text;
                const userId = update.message.from.id;
                
                // /start komutunu işle
                if (text === "/start") {
                  // Kullanıcıyı karşıla
                  const welcomeMessage = `🎉 Merhaba, ${update.message.from.first_name}!\n\n` +
                    `<b>${botData.name}</b> botu kullanmaya başladınız. ` +
                    `Artık tarafımızdan bilgilendirme mesajları alacaksınız.`;
                  
                  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                      chat_id: chatId,
                      text: welcomeMessage,
                      parse_mode: "HTML"
                    })
                  });
                  
                  // Kullanıcıyı veritabanına kaydet
                  if (update.message.chat.type === "private") {
                    const subscriber = {
                      telegram_id: userId,
                      username: update.message.from.username || "",
                      first_name: update.message.from.first_name,
                      last_name: update.message.from.last_name || null,
                      is_blocked: false,
                      joined_at: new Date().toISOString(),
                      last_active: new Date().toISOString(),
                      bot_id: botId
                    };
                    
                    const { data: existingSubscriber } = await supabase
                      .from("subscribers")
                      .select("id")
                      .eq("telegram_id", subscriber.telegram_id)
                      .eq("bot_id", botId)
                      .single();
                    
                    if (!existingSubscriber) {
                      await supabase.from("subscribers").insert(subscriber);
                      console.log(`New subscriber saved: ${subscriber.first_name} (${subscriber.telegram_id})`);
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
                        
                      console.log(`Subscriber updated: ${subscriber.first_name} (${subscriber.telegram_id})`);
                    }
                  }
                }
                
                // /help komutunu işle
                else if (text === "/help") {
                  const helpMessage = `📚 <b>${botData.name} - Yardım Menüsü</b>\n\n` +
                    `Bu bot size özel duyuru ve mesajlar gönderebilmektedir.\n\n` +
                    `<b>Kullanabileceğiniz komutlar:</b>\n` + 
                    `/start - Botu başlat ve bildirim almaya başla\n` +
                    `/help - Bu yardım menüsünü göster`;
                  
                  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                      chat_id: chatId,
                      text: helpMessage,
                      parse_mode: "HTML"
                    })
                  });
                }
              }
            }
            
            // İşlenen güncellemeleri temizle
            if (lastUpdateId > 0) {
              await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?offset=${lastUpdateId + 1}`);
            }
          }
        } catch (pollError) {
          console.error("Polling error:", pollError);
        }
      }, 2000); // Her 2 saniyede bir kontrol et - gerçek uygulamalarda bu değer daha yüksek olmalıdır
    } catch (pollingError) {
      console.error("Failed to start polling:", pollingError);
    }
    
    // Bot durumunu veritabanında güncelle
    await supabase
          .from("bots")
          .update({ 
            status: "online",
            last_active: new Date().toISOString()
          })
          .eq("id", botId);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Bot @${telegramBotInfo.username} activated successfully`,
        botInfo: telegramBotInfo
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to activate bot", 
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

Deno.serve(handler);