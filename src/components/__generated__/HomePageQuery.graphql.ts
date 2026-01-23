/**
 * @generated SignedSource<<f9e95a96296ceaca010bfff7df8fdd43>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type HomePageQuery$variables = Record<PropertyKey, never>;
export type HomePageQuery$data = {
  readonly viewer: {
    readonly appBskyActorProfileByDid: {
      readonly avatar: {
        readonly url: string;
      } | null | undefined;
      readonly displayName: string | null | undefined;
    } | null | undefined;
    readonly handle: string | null | undefined;
    readonly orgAtmosphereconfProfileByDid: {
      readonly avatar: {
        readonly url: string;
      } | null | undefined;
      readonly displayName: string | null | undefined;
    } | null | undefined;
  } | null | undefined;
};
export type HomePageQuery = {
  response: HomePageQuery$data;
  variables: HomePageQuery$variables;
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
    "name": "HomePageQuery",
    "selections": (v1/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "HomePageQuery",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "08cf2035f0b6aa42b0334c904e9c0f70",
    "id": null,
    "metadata": {},
    "name": "HomePageQuery",
    "operationKind": "query",
    "text": "query HomePageQuery {\n  viewer {\n    handle\n    appBskyActorProfileByDid {\n      displayName\n      avatar {\n        url(preset: \"avatar\")\n      }\n    }\n    orgAtmosphereconfProfileByDid {\n      displayName\n      avatar {\n        url(preset: \"avatar\")\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "73d9fce4f23216fe7afbe5c6e02a4aa3";

export default node;
