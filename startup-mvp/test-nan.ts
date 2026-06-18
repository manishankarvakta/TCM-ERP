import * as z from "zod";

const schema = z.object({
  port: z.coerce.number().optional().or(z.literal(0)),
});

try {
  console.log("Empty string:", schema.parse({ port: "" }));
  console.log("NaN:", schema.parse({ port: NaN }));
} catch (e: any) {
  console.log("Error:", e.errors);
}
