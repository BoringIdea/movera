export const ABI = {
  "address": "0x8cbc5e14932f74d6eb25a3a48797e4dafcab37c7b69cef9d1ec91795021225a0",
  "name": "aas",
  "friends": [],
  "exposed_functions": [
    {
      "name": "create_attestation",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address",
        "address",
        "address",
        "0x1::string::String",
        "u64",
        "u64",
        "u64",
        "bool",
        "vector<u8>"
      ],
      "return": []
    },
    {
      "name": "create_schema",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "vector<u8>",
        "0x1::string::String",
        "0x1::string::String",
        "0x1::string::String",
        "bool",
        "bool"
      ],
      "return": []
    },
    {
      "name": "create_schema_and_get_schema_address",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "vector<u8>",
        "0x1::string::String",
        "0x1::string::String",
        "0x1::string::String",
        "bool",
        "bool"
      ],
      "return": [
        "address"
      ]
    },
    {
      "name": "revoke_attestation",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address",
        "u64"
      ],
      "return": []
    }
  ],
  "structs": [
    {
      "name": "Attestation",
      "is_native": false,
      "abilities": [
        "copy",
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "id",
          "type": "u64"
        },
        {
          "name": "schema",
          "type": "address"
        },
        {
          "name": "ref_id",
          "type": "address"
        },
        {
          "name": "tx_hash",
          "type": "0x1::string::String"
        },
        {
          "name": "time",
          "type": "u64"
        },
        {
          "name": "expiration_time",
          "type": "u64"
        },
        {
          "name": "revocation_time",
          "type": "u64"
        },
        {
          "name": "revokable",
          "type": "bool"
        },
        {
          "name": "attester",
          "type": "address"
        },
        {
          "name": "data",
          "type": "vector<u8>"
        }
      ]
    },
    {
      "name": "Attestations",
      "is_native": false,
      "abilities": [
        "key"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "attestations",
          "type": "0x1::table::Table<u64, 0x8cbc5e14932f74d6eb25a3a48797e4dafcab37c7b69cef9d1ec91795021225a0::aas::Attestation>"
        }
      ]
    },
    {
      "name": "Schema",
      "is_native": false,
      "abilities": [
        "key"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "name",
          "type": "0x1::string::String"
        },
        {
          "name": "description",
          "type": "0x1::string::String"
        },
        {
          "name": "uri",
          "type": "0x1::string::String"
        },
        {
          "name": "creator",
          "type": "address"
        },
        {
          "name": "created_at",
          "type": "u64"
        },
        {
          "name": "schema",
          "type": "vector<u8>"
        },
        {
          "name": "revokable",
          "type": "bool"
        },
        {
          "name": "only_attest_by_creator",
          "type": "bool"
        },
        {
          "name": "next_attestation_id",
          "type": "u64"
        },
        {
          "name": "schema_signer_capability",
          "type": "0x1::account::SignerCapability"
        }
      ]
    }
  ]
}