import { redirect } from "@sveltejs/kit";
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } from "$env/static/private";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url }) => {
  const code = url.searchParams.get("code");
  if (!code) {
    throw redirect(302, "/?error=no_code");
  }

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const data = await response.json();

  if (data.error || !data.access_token) {
    throw redirect(302, `/?error=${data.error || "token_exchange_failed"}`);
  }

  throw redirect(302, `/?token=${data.access_token}`);
};
