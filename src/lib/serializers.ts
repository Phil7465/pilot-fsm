import { Decimal } from "@prisma/client/runtime/library";

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export function serializeJson<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, val) => {
      if (val instanceof Decimal) {
        return Number(val.toString());
      }
      return val;
    })
  );
}
