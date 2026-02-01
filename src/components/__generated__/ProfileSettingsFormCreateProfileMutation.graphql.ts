/**
 * @generated SignedSource<<750376c9a47a3d208e47ec71aeb89710>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type OrgAtmosphereconfProfileInput = {
  avatar?: BlobInput | null | undefined;
  createdAt?: string | null | undefined;
  description?: string | null | undefined;
  displayName?: string | null | undefined;
  homeTown?: string | null | undefined;
  interests?: string | null | undefined;
};
export type BlobInput = {
  mimeType: string;
  ref: string;
  size: number;
};
export type ProfileSettingsFormCreateProfileMutation$variables = {
  input: OrgAtmosphereconfProfileInput;
};
export type ProfileSettingsFormCreateProfileMutation$data = {
  readonly createOrgAtmosphereconfProfile: {
    readonly uri: string | null | undefined;
  } | null | undefined;
};
export type ProfileSettingsFormCreateProfileMutation = {
  response: ProfileSettingsFormCreateProfileMutation$data;
  variables: ProfileSettingsFormCreateProfileMutation$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "input"
  }
],
v1 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "input",
        "variableName": "input"
      },
      {
        "kind": "Literal",
        "name": "rkey",
        "value": "self"
      }
    ],
    "concreteType": "OrgAtmosphereconfProfile",
    "kind": "LinkedField",
    "name": "createOrgAtmosphereconfProfile",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "uri",
        "storageKey": null
      }
    ],
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "ProfileSettingsFormCreateProfileMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "ProfileSettingsFormCreateProfileMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "4f76b256bbc733db6175d4990027193a",
    "id": null,
    "metadata": {},
    "name": "ProfileSettingsFormCreateProfileMutation",
    "operationKind": "mutation",
    "text": "mutation ProfileSettingsFormCreateProfileMutation(\n  $input: OrgAtmosphereconfProfileInput!\n) {\n  createOrgAtmosphereconfProfile(input: $input, rkey: \"self\") {\n    uri\n  }\n}\n"
  }
};
})();

(node as any).hash = "c63ab61ed5193e5870155c629427b5d0";

export default node;
