/**
 * @generated SignedSource<<d5d54bd0c86ebe00b22156a69249802d>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type ProfileSettingsPageUploadBlobMutation$variables = {
  data: string;
  mimeType: string;
};
export type ProfileSettingsPageUploadBlobMutation$data = {
  readonly uploadBlob: {
    readonly mimeType: string;
    readonly ref: string;
    readonly size: number;
  };
};
export type ProfileSettingsPageUploadBlobMutation = {
  response: ProfileSettingsPageUploadBlobMutation$data;
  variables: ProfileSettingsPageUploadBlobMutation$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "data"
  },
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "mimeType"
  }
],
v1 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "data",
        "variableName": "data"
      },
      {
        "kind": "Variable",
        "name": "mimeType",
        "variableName": "mimeType"
      }
    ],
    "concreteType": "BlobUploadResponse",
    "kind": "LinkedField",
    "name": "uploadBlob",
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
    "name": "ProfileSettingsPageUploadBlobMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "ProfileSettingsPageUploadBlobMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "014c1a3c5485365d1c984939f3a127cc",
    "id": null,
    "metadata": {},
    "name": "ProfileSettingsPageUploadBlobMutation",
    "operationKind": "mutation",
    "text": "mutation ProfileSettingsPageUploadBlobMutation(\n  $data: String!\n  $mimeType: String!\n) {\n  uploadBlob(data: $data, mimeType: $mimeType) {\n    ref\n    mimeType\n    size\n  }\n}\n"
  }
};
})();

(node as any).hash = "5f8604063511eed022cd97805cf9fcf3";

export default node;
