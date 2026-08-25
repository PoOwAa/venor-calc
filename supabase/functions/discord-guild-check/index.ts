import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const discordBotToken = Deno.env.get("DISCORD_BOT_TOKEN");
    const discordGuildId = Deno.env.get("DISCORD_GUILD_ID");
    const requiredRoleId = Deno.env.get("DISCORD_REQUIRED_ROLE_ID") ?? null;

    if (
      !supabaseUrl ||
      !serviceRoleKey ||
      !discordBotToken ||
      !discordGuildId
    ) {
      return json(
        {
          allowed: false,
          reason:
            "A function nincs teljesen konfigurálva (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY/DISCORD_BOT_TOKEN/DISCORD_GUILD_ID).",
        },
        500,
      );
    }

    const authHeader = req.headers.get("Authorization");
    const accessToken = authHeader?.replace("Bearer ", "").trim();

    if (!accessToken) {
      return json({ allowed: false, reason: "Hiányzó auth token." }, 401);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const userResult = await supabase.auth.getUser(accessToken);

    if (userResult.error || !userResult.data.user) {
      return json({ allowed: false, reason: "Érvénytelen felhasználó." }, 401);
    }

    const user = userResult.data.user;
    const discordIdentity = user.identities?.find(
      (identity) => identity.provider === "discord",
    );

    if (!discordIdentity) {
      return json(
        {
          allowed: false,
          reason: "Ez a felhasználó nem Discord providerrel jelentkezett be.",
        },
        403,
      );
    }

    const discordUserId =
      (discordIdentity.identity_data?.sub as string | undefined) ??
      (discordIdentity.identity_data?.user_id as string | undefined) ??
      null;

    if (!discordUserId) {
      return json(
        {
          allowed: false,
          reason: "Nem található Discord user ID az identity adatokban.",
        },
        403,
      );
    }

    const memberResponse = await fetch(
      `https://discord.com/api/v10/guilds/${discordGuildId}/members/${discordUserId}`,
      {
        headers: {
          Authorization: `Bot ${discordBotToken}`,
        },
      },
    );

    if (memberResponse.status === 404) {
      return json(
        {
          allowed: false,
          reason: "A Discord felhasználó nem tagja a szükséges szervernek.",
        },
        403,
      );
    }

    if (!memberResponse.ok) {
      const details = await memberResponse.text();
      return json(
        {
          allowed: false,
          reason: `Discord API hiba: ${memberResponse.status}`,
          details,
        },
        502,
      );
    }

    const memberData = (await memberResponse.json()) as {
      roles?: string[];
    };

    if (requiredRoleId) {
      const hasRole = memberData.roles?.includes(requiredRoleId) ?? false;
      if (!hasRole) {
        return json(
          {
            allowed: false,
            reason:
              "A felhasználó nem rendelkezik a szükséges Discord role-lal.",
          },
          403,
        );
      }
    }

    return json({
      allowed: true,
      reason: "Discord tagság ellenőrizve.",
      guildId: discordGuildId,
      requiredRoleId,
    });
  } catch (error) {
    console.error(error);
    return json(
      {
        allowed: false,
        reason: "Váratlan hiba történt a Discord ellenőrzés során.",
      },
      500,
    );
  }
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
