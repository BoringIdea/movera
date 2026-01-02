module aas::attestation {
    use std::bcs;
    use std::vector;

    use aptos_framework::event;
    use aptos_framework::object;
    use aptos_framework::timestamp;
    use aptos_std::aptos_hash::{keccak256};

    use aas::package_manager;

    friend aas::aas;

    /*********** Structs ***********/

    /// Attestation struct to store the attestation information
    struct Attestation has key {
        schema: address,
        ref_attestation: address,
        time: u64,
        expiration_time: u64,
        revocation_time: u64,
        revokable: bool,
        attestor: address,
        recipient: address,
        data: vector<u8>,
        tx_hash: vector<u8>,
    }

    struct AttestationData {
        schema: address,
        ref_attestation: address,
        time: u64,
        expiration_time: u64,
        revocation_time: u64,
        revokable: bool,
        attestor: address,
        recipient: address,
        data: vector<u8>,
    }

    #[event]
    /// Event emitted when a new attestation is created
    struct AttestationCreated has drop, store {
        attestation_address: address,
        schema: address,
        ref_attestation: address,
        time: u64,
        expiration_time: u64,
        revokable: bool,
        attestor: address,
        recipient: address,
        data: vector<u8>,
    }

    #[event]
    /// Event emitted when an attestation is revoked
    struct AttestationRevoked has drop, store {
        attestation_address: address,
        revocation_time: u64,
    }

    /*********** Public Friend Functions ***********/

    public(friend) fun create_attestation(
        attestor: address, 
        recipient: address,
        schema_addr: address, 
        ref_attestation: address, 
        expiration_time: u64, 
        revokable: bool, 
        data: vector<u8>
    ): address {
        let now = timestamp::now_seconds();
        let seeds = get_attestation_seeds(attestor, schema_addr, recipient, ref_attestation, expiration_time, revokable, now, data);
        let constructor_ref = object::create_named_object(&package_manager::get_signer(), seeds);
        let object_signer = &object::generate_signer(&constructor_ref);

        move_to(object_signer, Attestation {
            schema: schema_addr,
            ref_attestation: ref_attestation,
            time: now,
            expiration_time: expiration_time,
            revokable: revokable,
            revocation_time: 0,
            attestor: attestor,
            recipient: recipient,
            data: data,
            tx_hash: vector::empty(),
        });

        let attestation_object = object::object_from_constructor_ref<Attestation>(&constructor_ref);
        let attestation_address = object::object_address<Attestation>(&attestation_object);
        
        event::emit(
            AttestationCreated {
                attestation_address: attestation_address,
                schema: schema_addr,
                ref_attestation: ref_attestation,
                time: now,
                expiration_time: expiration_time,
                revokable: revokable,
                attestor: attestor,
                recipient: recipient,
                data: data,
            }
        );

        attestation_address
    }

    public(friend) fun revoke_attestation(attestation_address: address) acquires Attestation {
        let attestation = unchecked_mut_attestation(attestation_address);
        attestation.revocation_time = timestamp::now_seconds();

        event::emit(
            AttestationRevoked {
                attestation_address: attestation_address,
                revocation_time: attestation.revocation_time,
            }
        );
    }

    /*********** View Functions ***********/

    #[view]
    public fun attestation_data(attestation_address: address): AttestationData acquires Attestation {
        let attestation = get_attestation(attestation_address);
        AttestationData {
            schema: attestation.schema,
            ref_attestation: attestation.ref_attestation,
            time: attestation.time,
            expiration_time: attestation.expiration_time,
            revocation_time: attestation.revocation_time,
            revokable: attestation.revokable,
            attestor: attestation.attestor,
            recipient: attestation.recipient,
            data: attestation.data,
        }
    }

    #[view]
    public fun attestation_unpacked(attestation_address: address): (
        address, 
        address, 
        u64, 
        u64, 
        u64, 
        bool,
        address, 
        address, 
        vector<u8>,
    ) acquires Attestation {
        let attestation = get_attestation(attestation_address);
        (
            attestation.schema, 
            attestation.ref_attestation, 
            attestation.time, 
            attestation.expiration_time,
            attestation.revocation_time,
            attestation.revokable,
            attestation.attestor,
            attestation.recipient,
            attestation.data,
        )
    }

    #[view]
    public fun attestation_exists(attestation_address: address): bool {
        exists<Attestation>(attestation_address)
    }

    #[view]
    public fun attestation_revoked(attestation_address: address): bool acquires Attestation {
        let attestation = get_attestation(attestation_address);
        attestation.revocation_time != 0
    }

    #[view]
    public fun get_attestation_address(
        attestor: address, 
        schema: address, 
        recipient: address, 
        ref_id: address, 
        expiration_time: u64, 
        revokable: bool, 
        now: u64, 
        data: vector<u8>
    ): address {
        let seeds = get_attestation_seeds(attestor, schema, recipient, ref_id, expiration_time, revokable, now, data);
        object::create_object_address(&package_manager::get_signer_address(), seeds)
    }

    #[view]
    public fun get_attestation_seeds(
        attestor: address, 
        schema: address, 
        recipient: address, 
        ref_id: address, 
        expiration_time: u64, 
        revokable: bool, 
        now: u64, 
        data: vector<u8>
    ): vector<u8> {
        let seed = bcs::to_bytes(&attestor);
        vector::append(&mut seed, bcs::to_bytes(&schema));
        vector::append(&mut seed, bcs::to_bytes(&recipient));
        vector::append(&mut seed, bcs::to_bytes(&ref_id));
        vector::append(&mut seed, bcs::to_bytes(&expiration_time));
        vector::append(&mut seed, bcs::to_bytes(&revokable));
        vector::append(&mut seed, bcs::to_bytes(&now));
        vector::append(&mut seed, data);
        keccak256(seed)
    }

    inline fun unchecked_mut_attestation(attestation_address: address): &mut Attestation acquires Attestation {
        borrow_global_mut<Attestation>(attestation_address)
    }

    inline fun get_attestation(attestation_address: address): &Attestation acquires Attestation {
        borrow_global<Attestation>(attestation_address)
    }

}