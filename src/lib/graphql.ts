/**
 * Tagged template for GraphQL queries.
 * The Relay compiler will pick up these tags and generate TypeScript types.
 */
export function graphql(strings: TemplateStringsArray): string {
  return strings[0]!;
}
