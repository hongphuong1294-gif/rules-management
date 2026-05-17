export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DocumentException {
  id: string;
  page: number;
  location: string;
  description: string;
  severity: "high" | "medium" | "low";
  field?: string;
  value?: string;
  expectedValue?: string;
  boundingBox?: BoundingBox;
}

export interface DocumentElement {
  element_id: string;
  element_name: string;
  element_type: "field" | "column" | "row" | "label" | "value" | "total" | "subtotal" | "date" | "amount" | "text";
  description?: string;
  bounding_box?: BoundingBox;
}

export interface DocumentSection {
  section_id: string;
  section_name: string;
  section_type: "header" | "table" | "text_block" | "footer" | "signature_block" | "form_field" | "chart" | "summary";
  page?: number;
  bounding_box?: BoundingBox;
  elements: DocumentElement[];
  verified?: boolean;
}

export interface ExtractedRule {
  rule_code: string;
  name: string;
  description: string;
  type: "threshold" | "calculation" | "cross_table" | "data_presence" | "pattern_match" | "custom";
  category: string;
  trigger_condition: string;
  action: string;
  scope?: string;
  mapped_sections?: string[];
  mapped_elements?: string[];
  parameters?: Record<string, unknown>;
  status?: "complete" | "draft" | "ambiguous";
  verified?: boolean;
}

export interface UploadedFile {
  id: string;
  file: File;
  category: "document" | "rules";
  name: string;
  type: string;
  status: "pending" | "processing" | "analyzed" | "error";
  base64?: string;
  parsedContent?: string;
}

export type OnboardingStep = "upload" | "sections" | "rules" | "complete";
