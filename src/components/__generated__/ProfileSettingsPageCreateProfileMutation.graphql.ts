/**
 * @generated SignedSource<<7b22f05fd50fdda140be51e596e07f1f>>
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
export type ProfileSettingsPageCreateProfileMutation$variables = {
  input: OrgAtmosphereconfProfileInput;
};
export type ProfileSettingsPageCreateProfileMutation$data = {
  readonly createOrgAtmosphereconfProfile: {
    readonly uri: string | null | undefined;
  } | null | undefined;
};
export type ProfileSettingsPageCreateProfileMutation = {
  response: ProfileSettingsPageCreateProfileMutation$data;
  variables: ProfileSettingsPageCreateProfileMutation$variables;
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
    "name": "ProfileSettingsPageCreateProfileMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "ProfileSettingsPageCreateProfileMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "025c406541affc300ed94bbac4f0c36b",
    "id": null,
    "metadata": {},
    "name": "ProfileSettingsPageCreateProfileMutation",
    "operationKind": "mutation",
    "text": "mutation ProfileSettingsPageCreateProfileMutation(\n  $input: OrgAtmosphereconfProfileInput!\n) {\n  createOrgAtmosphereconfProfile(input: $input, rkey: \"self\") {\n    uri\n  }\n}\n"
  }
};
})();

(node as any).hash = "b8b034ca8b781910bb5a72fc61ca5ab8";

export default node;
