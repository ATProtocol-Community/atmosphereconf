/**
 * @generated SignedSource<<8ff6f83345a6f0bc289125473fb4b905>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type ProfileSettingsFormUploadBlobMutation$variables = {
  data: string;
  mimeType: string;
};
export type ProfileSettingsFormUploadBlobMutation$data = {
  readonly uploadBlob: {
    readonly mimeType: string;
    readonly ref: string;
    readonly size: number;
  };
};
export type ProfileSettingsFormUploadBlobMutation = {
  response: ProfileSettingsFormUploadBlobMutation$data;
  variables: ProfileSettingsFormUploadBlobMutation$variables;
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
    "name": "ProfileSettingsFormUploadBlobMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "ProfileSettingsFormUploadBlobMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "959c3d6dbe077a4841d18d216ba4ce7a",
    "id": null,
    "metadata": {},
    "name": "ProfileSettingsFormUploadBlobMutation",
    "operationKind": "mutation",
    "text": "mutation ProfileSettingsFormUploadBlobMutation(\n  $data: String!\n  $mimeType: String!\n) {\n  uploadBlob(data: $data, mimeType: $mimeType) {\n    ref\n    mimeType\n    size\n  }\n}\n"
  }
};
})();

(node as any).hash = "ddb312df6e0e4f40304b1c1cbeccc35a";

export default node;
