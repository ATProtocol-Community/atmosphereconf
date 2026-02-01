/**
 * @generated SignedSource<<9f501fcb581b74ce6a162840c756d8d1>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type profileRegularQuery$variables = Record<PropertyKey, never>;
export type profileRegularQuery$data = {
  readonly viewer: {
    readonly appBskyActorProfileByDid: {
      readonly avatar: {
        readonly url: string;
      } | null | undefined;
      readonly displayName: string | null | undefined;
    } | null | undefined;
    readonly did: string;
    readonly handle: string | null | undefined;
    readonly orgAtmosphereconfProfileByDid: {
      readonly avatar: {
        readonly url: string;
      } | null | undefined;
      readonly displayName: string | null | undefined;
    } | null | undefined;
  } | null | undefined;
};
export type profileRegularQuery = {
  response: profileRegularQuery$data;
  variables: profileRegularQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "displayName",
    "storageKey": null
  },
  {
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
  }
],
v1 = [
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
        "selections": (v0/*: any*/),
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "OrgAtmosphereconfProfile",
        "kind": "LinkedField",
        "name": "orgAtmosphereconfProfileByDid",
        "plural": false,
        "selections": (v0/*: any*/),
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
    "name": "profileRegularQuery",
    "selections": (v1/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "profileRegularQuery",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "38434cc8023cd62225f0dfd7070087d9",
    "id": null,
    "metadata": {},
    "name": "profileRegularQuery",
    "operationKind": "query",
    "text": "query profileRegularQuery {\n  viewer {\n    did\n    handle\n    appBskyActorProfileByDid {\n      displayName\n      avatar {\n        url(preset: \"avatar\")\n      }\n    }\n    orgAtmosphereconfProfileByDid {\n      displayName\n      avatar {\n        url(preset: \"avatar\")\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "76dac20a75e78d436c1b11dac251b748";

export default node;
