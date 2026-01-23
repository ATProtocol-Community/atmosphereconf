/**
 * @generated SignedSource<<f71b71829032c0438f28799646a69868>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type HeaderQuery$variables = Record<PropertyKey, never>;
export type HeaderQuery$data = {
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
export type HeaderQuery = {
  response: HeaderQuery$data;
  variables: HeaderQuery$variables;
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
    "name": "HeaderQuery",
    "selections": (v1/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "HeaderQuery",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "49f131af2a7e904c8816e7fecac55009",
    "id": null,
    "metadata": {},
    "name": "HeaderQuery",
    "operationKind": "query",
    "text": "query HeaderQuery {\n  viewer {\n    handle\n    appBskyActorProfileByDid {\n      displayName\n      avatar {\n        url(preset: \"avatar\")\n      }\n    }\n    orgAtmosphereconfProfileByDid {\n      displayName\n      avatar {\n        url(preset: \"avatar\")\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "5052b258a1cbc72df7424f3acb80a6cd";

export default node;
