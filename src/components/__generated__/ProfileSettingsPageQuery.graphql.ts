/**
 * @generated SignedSource<<f83e4d3f88a7007d576517b5471d8d01>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type ProfileSettingsPageQuery$variables = Record<PropertyKey, never>;
export type ProfileSettingsPageQuery$data = {
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
        readonly mimeType: string;
        readonly ref: string;
        readonly size: number;
        readonly url: string;
      } | null | undefined;
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
export type ProfileSettingsPageQuery = {
  response: ProfileSettingsPageQuery$data;
  variables: ProfileSettingsPageQuery$variables;
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
},
v2 = [
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
          {
            "alias": null,
            "args": null,
            "concreteType": "Blob",
            "kind": "LinkedField",
            "name": "avatar",
            "plural": false,
            "selections": [
              (v1/*: any*/)
            ],
            "storageKey": null
          }
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
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "description",
            "storageKey": null
          },
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
                "args": null,
                "kind": "ScalarField",
                "name": "ref",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "mimeType",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "size",
                "storageKey": null
              },
              (v1/*: any*/)
            ],
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
    "name": "ProfileSettingsPageQuery",
    "selections": (v2/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "ProfileSettingsPageQuery",
    "selections": (v2/*: any*/)
  },
  "params": {
    "cacheID": "c49152ff73b713042b13de2eb570daf7",
    "id": null,
    "metadata": {},
    "name": "ProfileSettingsPageQuery",
    "operationKind": "query",
    "text": "query ProfileSettingsPageQuery {\n  viewer {\n    did\n    handle\n    appBskyActorProfileByDid {\n      displayName\n      avatar {\n        url(preset: \"avatar\")\n      }\n    }\n    orgAtmosphereconfProfileByDid {\n      displayName\n      description\n      homeTown {\n        name\n        value\n      }\n      interests\n      avatar {\n        ref\n        mimeType\n        size\n        url(preset: \"avatar\")\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "3f4433ef9ed06827df9e3aecd0b17407";

export default node;
