import { redirect } from "@sveltejs/kit";
import { GITHUB_CLIENT_ID } from "$env/static/private";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = ({ url }) => {
  const redirectUri = `${url.origin}/api/auth/callback`;
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    scope: "read:org repo",
    redirect_uri: redirectUri,
  });

  throw redirect(302, `https://github.com/login/oauth/authorize?${params.toString()}`);
};
