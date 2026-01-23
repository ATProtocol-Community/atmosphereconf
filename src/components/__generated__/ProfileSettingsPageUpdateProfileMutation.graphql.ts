/**
 * @generated SignedSource<<6f7d3ba8bfd563205f559f8f8094f8c0>>
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
export type ProfileSettingsPageUpdateProfileMutation$variables = {
  input: OrgAtmosphereconfProfileInput;
};
export type ProfileSettingsPageUpdateProfileMutation$data = {
  readonly updateOrgAtmosphereconfProfile: {
    readonly uri: string | null | undefined;
  } | null | undefined;
};
export type ProfileSettingsPageUpdateProfileMutation = {
  response: ProfileSettingsPageUpdateProfileMutation$data;
  variables: ProfileSettingsPageUpdateProfileMutation$variables;
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
    "name": "ProfileSettingsPageUpdateProfileMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "ProfileSettingsPageUpdateProfileMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "8e32a057e2e672e1eec2c18fc3536bce",
    "id": null,
    "metadata": {},
    "name": "ProfileSettingsPageUpdateProfileMutation",
    "operationKind": "mutation",
    "text": "mutation ProfileSettingsPageUpdateProfileMutation(\n  $input: OrgAtmosphereconfProfileInput!\n) {\n  updateOrgAtmosphereconfProfile(rkey: \"self\", input: $input) {\n    uri\n  }\n}\n"
  }
};
})();

(node as any).hash = "50d28aba942a0f9fb55c39656c9a76ca";

export default node;
