/**
 * @generated SignedSource<<e0f7a7cef4f5299c92b8866698686c93>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type ProfilePageQuery$variables = Record<PropertyKey, never>;
export type ProfilePageQuery$data = {
  readonly viewer: {
    readonly appBskyActorProfileByDid: {
      readonly avatar: {
        readonly url: string;
      } | null | undefined;
      readonly description: string | null | undefined;
      readonly displayName: string | null | undefined;
    } | null | undefined;
    readonly did: string;
    readonly handle: string | null | undefined;
    readonly orgAtmosphereconfProfileByDid: {
      readonly avatar: {
        readonly url: string;
      } | null | undefined;
      readonly createdAt: string | null | undefined;
      readonly description: string | null | undefined;
      readonly displayName: string | null | undefined;
      readonly homeTown: {
        readonly name: string | null | undefined;
        readonly value: string;
      } | null | undefined;
      readonly interests: ReadonlyArray<string> | null | undefined;
    } | null | undefined;
  } | null | undefined;
};
export type ProfilePageQuery = {
  response: ProfilePageQuery$data;
  variables: ProfilePageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "displayName",
  "storageKey": null
},
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "description",
  "storageKey": null
},
v2 = {
  "alias": null,
  "args": null,
  "concreteType": "Blob",
  "kind": "LinkedField",
  "name": "avatar",
  "plural": false,
  "selections": [
    {
      "alias": null,
      "args": [
        {
          "kind": "Literal",
          "name": "preset",
          "value": "avatar"
        }
      ],
      "kind": "ScalarField",
      "name": "url",
      "storageKey": "url(preset:\"avatar\")"
    }
  ],
  "storageKey": null
},
v3 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "Viewer",
    "kind": "LinkedField",
    "name": "viewer",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "did",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "handle",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "AppBskyActorProfile",
        "kind": "LinkedField",
        "name": "appBskyActorProfileByDid",
        "plural": false,
        "selections": [
          (v0/*: any*/),
          (v1/*: any*/),
          (v2/*: any*/)
        ],
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "OrgAtmosphereconfProfile",
        "kind": "LinkedField",
        "name": "orgAtmosphereconfProfileByDid",
        "plural": false,
        "selections": [
          (v0/*: any*/),
          (v1/*: any*/),
          {
            "alias": null,
            "args": null,
            "concreteType": "CommunityLexiconLocationHthree",
            "kind": "LinkedField",
            "name": "homeTown",
            "plural": false,
            "selections": [
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "name",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "value",
                "storageKey": null
              }
            ],
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "interests",
            "storageKey": null
          },
          (v2/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "createdAt",
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ],
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "ProfilePageQuery",
    "selections": (v3/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "ProfilePageQuery",
    "selections": (v3/*: any*/)
  },
  "params": {
    "cacheID": "8263cb875004c38fad157d783787cfbc",
    "id": null,
    "metadata": {},
    "name": "ProfilePageQuery",
    "operationKind": "query",
    "text": "query ProfilePageQuery {\n  viewer {\n    did\n    handle\n    appBskyActorProfileByDid {\n      displayName\n      description\n      avatar {\n        url(preset: \"avatar\")\n      }\n    }\n    orgAtmosphereconfProfileByDid {\n      displayName\n      description\n      homeTown {\n        name\n        value\n      }\n      interests\n      avatar {\n        url(preset: \"avatar\")\n      }\n      createdAt\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "3eb82155e30888c7c917e8f96beb7f2a";

export default node;
