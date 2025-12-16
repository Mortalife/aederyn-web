// AI schema utilities - now using Zod schemas directly with OpenAI structured output
// The AI-specific schemas are defined in ai-service.ts
// This file is kept for backward compatibility with getSchemaPrompt used in ai-context.ts

import { zodToJsonSchema } from "zod-to-json-schema";
import type { JsonSchema7Type } from "zod-to-json-schema";
import {
  ItemSchema as ItemZodSchema,
  NPCSchema as NPCZodSchema,
  QuestSchema as QuestZodSchema,
} from "@aederyn/types";

// Generate JSON schemas directly from Zod schemas
// These automatically update when the Zod schemas change
export const ItemJsonSchema = zodToJsonSchema(ItemZodSchema, {
  $refStrategy: "none",
  target: "openApi3",
});

export const NPCJsonSchema = zodToJsonSchema(NPCZodSchema, {
  $refStrategy: "none",
  target: "openApi3",
});

export const QuestJsonSchema = zodToJsonSchema(QuestZodSchema, {
  $refStrategy: "none",
  target: "openApi3",
});

// Convert JSON schema to prompt-friendly format (used for context, not for structured output)
function jsonSchemaToPrompt(schema: JsonSchema7Type, indent = 0): string {
  const pad = "  ".repeat(indent);
  
  if (typeof schema !== "object" || schema === null) {
    return "<unknown>";
  }
  
  const s = schema as Record<string, unknown>;
  
  if (s.type === "object" && s.properties) {
    const lines: string[] = ["{"];
    const props = s.properties as Record<string, JsonSchema7Type>;
    const required = (s.required as string[]) || [];
    
    for (const [key, prop] of Object.entries(props)) {
      const isRequired = required.includes(key);
      const suffix = isRequired ? "" : " // optional";
      const desc = (prop as Record<string, unknown>).description;
      const descSuffix = desc ? ` // ${desc}` : "";
      
      const propValue = formatProperty(prop, indent + 1);
      lines.push(`${pad}  "${key}": ${propValue}${suffix}${descSuffix}`);
    }
    
    lines.push(`${pad}}`);
    return lines.join("\n");
  }
  
  return formatProperty(schema, indent);
}

function formatProperty(prop: JsonSchema7Type, indent: number): string {
  if (typeof prop !== "object" || prop === null) {
    return "<unknown>";
  }
  
  const p = prop as Record<string, unknown>;
  
  // Handle anyOf/oneOf (union types)
  if (p.anyOf || p.oneOf) {
    const variants = (p.anyOf || p.oneOf) as JsonSchema7Type[];
    const types = variants.map(v => {
      const vObj = v as Record<string, unknown>;
      if (vObj.type === "object" && vObj.properties) {
        return jsonSchemaToPrompt(v, indent);
      }
      return formatProperty(v, indent);
    });
    return types.join(" | ");
  }
  
  // Handle enums
  if (p.enum) {
    return `"${(p.enum as string[]).join("|")}"` + ",";
  }
  
  // Handle arrays
  if (p.type === "array" && p.items) {
    const itemFormat = formatProperty(p.items as JsonSchema7Type, indent + 1);
    return `[${itemFormat}],`;
  }
  
  // Handle nested objects
  if (p.type === "object" && p.properties) {
    return jsonSchemaToPrompt(prop, indent) + ",";
  }
  
  // Handle additionalProperties (Record types)
  if (p.type === "object" && p.additionalProperties) {
    const valueType = formatProperty(p.additionalProperties as JsonSchema7Type, indent);
    return `{ "<key>": ${valueType} },`;
  }
  
  // Handle primitives
  if (p.type === "string") return "<string>,";
  if (p.type === "number" || p.type === "integer") return "<number>,";
  if (p.type === "boolean") return "<boolean>,";
  if (p.type === "null") return "null,";
  
  // Handle nullable
  if (Array.isArray(p.type)) {
    const nonNull = (p.type as string[]).filter(t => t !== "null")[0];
    return `<${nonNull} | null>,`;
  }
  
  return "<unknown>,";
}

// Get schema prompt for a given entity type (used in ai-context.ts for prompt generation)
// Note: Actual structured output uses Zod schemas directly in ai-service.ts
export function getSchemaPrompt(entityType: "item" | "npc" | "quest"): string {
  switch (entityType) {
    case "item":
      return jsonSchemaToPrompt(ItemJsonSchema as JsonSchema7Type);
    case "npc":
      return jsonSchemaToPrompt(NPCJsonSchema as JsonSchema7Type);
    case "quest":
      return jsonSchemaToPrompt(QuestJsonSchema as JsonSchema7Type);
  }
}
