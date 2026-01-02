import { bcs } from '@mysten/sui/bcs';
 
 export type MoveType = 'u8' | 'u16' | 'u32' | 'u64' | 'u128' | 'u256' | 'bool' | 'String' | 'Address' | 'Vector';

 export type SchemaField = {
  name: string;
  type: MoveType;
  vectorType?: MoveType;
};

export type SchemaItemValue = string | number | bigint | boolean | SchemaItemValue[] | { [key: string]: SchemaItemValue };

export type SchemaItem = {
  [key: string]: SchemaItemValue;
};

export class Codec {
  private schema: SchemaField[];

  constructor(schemaString: string) {
    this.schema = this.parseSchemaString(schemaString);
  }

  private parseSchemaString(schemaString: string): SchemaField[] {
    return schemaString.split(',').map(field => {
      const [name, type] = field.trim().split(':').map(s => s.trim());
      if (type.startsWith('Vector<') && type.endsWith('>')) {
        const vectorType = type.slice(7, -1) as MoveType;
        return { name, type: 'Vector' as MoveType, vectorType };
      }
      return { name, type: type as MoveType };
    });
  }

  public schemaItem(): SchemaField[] {
    return this.schema;
  }

  encode(item: SchemaItem): string {
    const encodedFields = this.schema.map(field => ({
      name: field.name,
      type: field.type,
      vectorType: field.vectorType,
      value: this.encodeValue(item[field.name], field.type, field.vectorType)
    }));
    return JSON.stringify(encodedFields);
  }

  private encodeValue(value: SchemaItemValue, type: MoveType, vectorType?: MoveType): string {
    if (type === 'Vector' && Array.isArray(value)) {
      return JSON.stringify(value.map(v => this.encodeValue(v, vectorType!)));
    }
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value?.toString() || '';
  }

  decode(encodedString: string): SchemaItem {
    const encodedFields = JSON.parse(encodedString);
    const item: SchemaItem = {};

    for (const field of encodedFields) {
      const schemaField = this.schema.find(f => f.name === field.name);
      if (!schemaField) continue;

      item[field.name] = this.decodeValue(field.value, schemaField.type, schemaField.vectorType);
    }

    return item;
  }

  private decodeValue(value: string, type: MoveType, vectorType?: MoveType): SchemaItemValue {
    switch (type) {
      case 'u8':
      case 'u16':
      case 'u32':
        return Number(value);
      case 'u64':
      case 'u128':
      case 'u256':
        return BigInt(value);
      case 'bool':
        return value.toLowerCase() === 'true';
      case 'String':
      case 'Address':
        return value;
      case 'Vector':
        const parsedArray = JSON.parse(value);
        return parsedArray.map((v: string) => this.decodeValue(v, vectorType!));
      default:
        return value;
    }
  }

  encodeToBytes(item: SchemaItem): Uint8Array {
    const encodedString = this.encode(item);
    return bcs.string().serialize(encodedString).toBytes();
  }

  decodeFromBytes(bytes: Uint8Array): SchemaItem {
    const decodedString = bcs.string().parse(bytes);
    return this.decode(decodedString);
  }
}
