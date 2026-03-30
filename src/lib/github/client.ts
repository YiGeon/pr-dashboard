import { graphql } from "@octokit/graphql";
import { MY_PRS_QUERY, REVIEW_REQUESTED_QUERY, parseMyPRs, parseReviewRequestedPRs } from "./queries";
import type { MyPR, ReviewRequestedPR } from "../types";

let graphqlClient: typeof graphql | null = null;
let currentUsername: string = "";

export function initClient(token: string) {
  graphqlClient = graphql.defaults({
    headers: { authorization: `token ${token}` },
  });
}

export function clearClient() {
  graphqlClient = null;
  currentUsername = "";
}

export async function fetchUsername(): Promise<string> {
  if (!graphqlClient) throw new Error("Client not initialized");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await graphqlClient(`query { viewer { login } }`);
  currentUsername = data.viewer.login;
  return currentUsername;
}

export function getUsername(): string {
  return currentUsername;
}

export async function fetchMyPRs(): Promise<MyPR[]> {
  if (!graphqlClient) throw new Error("Client not initialized");
  if (!currentUsername) await fetchUsername();
  const data = await graphqlClient(MY_PRS_QUERY, {
    searchQuery: `is:pr is:open author:${currentUsername}`,
  });
  return parseMyPRs(data);
}

export async function fetchReviewRequestedPRs(): Promise<ReviewRequestedPR[]> {
  if (!graphqlClient) throw new Error("Client not initialized");
  if (!currentUsername) await fetchUsername();
  const data = await graphqlClient(REVIEW_REQUESTED_QUERY, {
    searchQuery: `is:pr is:open review-requested:${currentUsername}`,
  });
  return parseReviewRequestedPRs(data, currentUsername);
}

export async function fetchApprovedPRs(): Promise<ReviewRequestedPR[]> {
  if (!graphqlClient) throw new Error("Client not initialized");
  if (!currentUsername) await fetchUsername();
  const data = await graphqlClient(REVIEW_REQUESTED_QUERY, {
    searchQuery: `is:pr is:open reviewed-by:${currentUsername} -author:${currentUsername}`,
  });
  return parseReviewRequestedPRs(data, currentUsername, false)
    .filter((pr) => pr.myReviewStatus === "approved");
}

export async function fetchOrganizations(): Promise<string[]> {
  if (!graphqlClient) throw new Error("Client not initialized");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await graphqlClient(`
    query {
      viewer {
        organizations(first: 50) {
          nodes { login }
        }
      }
    }
  `);
  return data.viewer.organizations.nodes.map((org: any) => org.login);
}
