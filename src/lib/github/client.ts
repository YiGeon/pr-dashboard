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

const MAX_PAGES = 10; // 500 results max — GitHub search 무한 루프 방지

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAllPages(gqlQuery: string, searchQuery: string): Promise<any[]> {
  if (!graphqlClient) throw new Error("Client not initialized");
  if (!currentUsername) await fetchUsername();

  const allNodes: any[] = [];
  let after: string | null = null;
  let pageCount = 0;

  do {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await graphqlClient(gqlQuery, { searchQuery, after });
    const { nodes, pageInfo } = data.search;
    allNodes.push(...nodes);
    after = pageInfo.hasNextPage ? pageInfo.endCursor : null;
  } while (after && ++pageCount < MAX_PAGES);

  return allNodes;
}

export async function fetchMyPRs(): Promise<MyPR[]> {
  const nodes = await fetchAllPages(MY_PRS_QUERY, `is:pr is:open author:${currentUsername}`);
  return parseMyPRs(nodes);
}

export async function fetchReviewRequestedPRs(): Promise<ReviewRequestedPR[]> {
  const nodes = await fetchAllPages(REVIEW_REQUESTED_QUERY, `is:pr is:open review-requested:${currentUsername}`);
  return parseReviewRequestedPRs(nodes, currentUsername);
}

// reviewed-by: 쿼리는 모든 리뷰 상태를 반환하므로 클라이언트에서 approved만 필터링
export async function fetchApprovedPRs(): Promise<ReviewRequestedPR[]> {
  const nodes = await fetchAllPages(REVIEW_REQUESTED_QUERY, `is:pr is:open reviewed-by:${currentUsername} -author:${currentUsername}`);
  return parseReviewRequestedPRs(nodes, currentUsername, false)
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
