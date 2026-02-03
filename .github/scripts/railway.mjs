/**
 * Helper to interact with Railway GraphQL API v2
 * since the command line refuses to work with tokens.
 */
async function railwayQuery({ token, query, variables = {} }) {
  const res = await fetch("https://backboard.railway.com/graphql/v2", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) {
    throw new Error(
      `Railway API Error: ${json.errors.map((e) => e.message).join(", ")}`,
    );
  }
  return json.data;
}
export async function getEnvironmentId({ token, projectId, name }) {
  const data = await railwayQuery({
    token,
    query: `query GetEnvironments($projectId: String!) {
        environments(projectId: $projectId) {
            edges { node { id name } }
        }
    }`,
    variables: { projectId },
  });
  const env = data.environments.edges.find((e) => e.node.name === name);
  return env ? env.node.id : null;
}
export async function getLatestDeploymentStatus({
  token,
  projectId,
  environmentId,
}) {
  const data = await railwayQuery({
    token,
    query: `query GetLatestDeployment($projectId: String!, $environmentId: String!) {
        deployments(first: 1, input: {
            projectId: $projectId,
            environmentId: $environmentId,
        }) {
        edges { node { id status } }
        }
    }`,
    variables: { projectId, environmentId },
  });
  return data.deployments?.edges?.[0]?.node?.status;
}
