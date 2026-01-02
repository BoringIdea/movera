import { Codec } from '../src/codec';

const schemaCodec = new Codec("name: String, age: u64, scores: Vector<u16>, address: Address");
 
// Encode
const item = {
  name: "Alice",
  age: 30n,
  scores: [95n, 87n, 91n],
  address: "0x1234567890abcdef"
};

// Encode
const encodedString = schemaCodec.encode(item);
console.log('encodedString:', encodedString);

// Decode
const decodedItem = schemaCodec.decode(encodedString);
console.log('decodedItem', decodedItem);

// Encode Uint8Array
const encodedBytes = schemaCodec.encodeToBytes(item);
console.log('encodedBytes', encodedBytes);

// Decode Uint8Array
const decodedItemFromBytes = schemaCodec.decodeFromBytes(encodedBytes);
console.log('decodedItemFromBytes', decodedItemFromBytes);

