/**
 * @generated SignedSource<<8b49e846fa59e3612c067b0345d434a3>>
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
export type ProfileSettingsFormUpdateProfileMutation$variables = {
  input: OrgAtmosphereconfProfileInput;
};
export type ProfileSettingsFormUpdateProfileMutation$data = {
  readonly updateOrgAtmosphereconfProfile: {
    readonly uri: string | null | undefined;
  } | null | undefined;
};
export type ProfileSettingsFormUpdateProfileMutation = {
  response: ProfileSettingsFormUpdateProfileMutation$data;
  variables: ProfileSettingsFormUpdateProfileMutation$variables;
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
    "name": "updateOrgAtmosphereconfProfile",
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
    "name": "ProfileSettingsFormUpdateProfileMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "ProfileSettingsFormUpdateProfileMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "988517a9a9b64a0386c38f9aeed37aad",
    "id": null,
    "metadata": {},
    "name": "ProfileSettingsFormUpdateProfileMutation",
    "operationKind": "mutation",
    "text": "mutation ProfileSettingsFormUpdateProfileMutation(\n  $input: OrgAtmosphereconfProfileInput!\n) {\n  updateOrgAtmosphereconfProfile(rkey: \"self\", input: $input) {\n    uri\n  }\n}\n"
  }
};
})();

(node as any).hash = "a4239fd4172d96e9e72718d2d69f103f";

export default node;
