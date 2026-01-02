#[test_only]
module aas::aas_tests {
    use aptos_framework::string;
    use aptos_framework::signer;
    use aptos_framework::timestamp;

    use aas::schema;
    use aas::attestation;
    use aas::aas;
    use aas::test_helpers;

    #[test(publisher = @0x101, test_account = @0xcafe)]
    fun test_e2e(publisher: &signer, test_account: &signer) {
        test_helpers::setup(publisher);

        let schema_raw: vector<u8> = b"name: String, age: u16";
        let name = string::utf8(b"Profile");
        let description = string::utf8(b"User Profile");
        let uri = string::utf8(b"www.google.com");
        
        // create a new schema
        let schema_addr = aas::create_schema_and_get_schema_address(
            test_account,
            schema_raw,
            name,
            description,
            uri,
            true,
            @0x0,
        );

        let expected_schema_address = schema::get_schema_address(
            name, 
            description,
            uri,
            true,
            @0x0,
            schema_raw,
        );

        assert!(schema_addr == expected_schema_address, 0);

        // create an attestation
        let attestation_addr = aas::create_attestation_and_get_address(
            test_account,
            signer::address_of(test_account),
            schema_addr,
            @0x0,
            0,
            true,
            b"name: alice, age: 20",
        );

        assert!(attestation::attestation_exists(attestation_addr), 1);

        // revoke the attestation
        timestamp::update_global_time_for_test_secs(10000000);
        aas::revoke_attestation(test_account, schema_addr, attestation_addr);

        let (_, _, _, _, revocation_time, _, _, _, _) = attestation::attestation_unpacked(attestation_addr);
        assert!(revocation_time == 10000000, 2);
    }

}