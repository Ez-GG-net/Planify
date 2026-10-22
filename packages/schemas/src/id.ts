import { z } from "zod"

const UUIDv7Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const IDv1Schema = z.string().regex(
    UUIDv7Regex,
    "Invalid ID"
);

export const ToolCallIDSchema = z.string().length(6);
export const ActionIDSchema = z.string().length(6);  
export const GenerationCancelIDSchema = z.string().length(6);