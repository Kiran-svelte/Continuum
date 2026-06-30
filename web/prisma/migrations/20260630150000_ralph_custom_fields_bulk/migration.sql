-- RALPH-20260630-017: Custom Fields
CREATE TABLE "CustomField" (
  "id"          TEXT NOT NULL,
  "company_id"  TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "field_name"  TEXT NOT NULL,
  "field_label" TEXT NOT NULL,
  "field_type"  TEXT NOT NULL,
  "options"     JSONB,
  "is_required" BOOLEAN NOT NULL DEFAULT false,
  "is_active"   BOOLEAN NOT NULL DEFAULT true,
  "sort_order"  INTEGER NOT NULL DEFAULT 0,
  "created_by"  TEXT NOT NULL,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomField_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomField_company_id_entity_type_field_name_key" ON "CustomField"("company_id", "entity_type", "field_name");
CREATE INDEX "CustomField_company_id_idx" ON "CustomField"("company_id");
ALTER TABLE "CustomField" ADD CONSTRAINT "CustomField_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE;

CREATE TABLE "CustomFieldValue" (
  "id"          TEXT NOT NULL,
  "company_id"  TEXT NOT NULL,
  "field_id"    TEXT NOT NULL,
  "entity_id"   TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "value"       TEXT,
  "value_json"  JSONB,
  "updated_at"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomFieldValue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomFieldValue_field_id_entity_id_key" ON "CustomFieldValue"("field_id", "entity_id");
CREATE INDEX "CustomFieldValue_company_id_idx" ON "CustomFieldValue"("company_id");
CREATE INDEX "CustomFieldValue_entity_id_idx" ON "CustomFieldValue"("entity_id");
ALTER TABLE "CustomFieldValue" ADD CONSTRAINT "CustomFieldValue_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "CustomField"("id") ON DELETE CASCADE;

-- RALPH-20260630-018: Bulk Operations
CREATE TABLE "BulkJob" (
  "id"           TEXT NOT NULL,
  "company_id"   TEXT NOT NULL,
  "type"         TEXT NOT NULL,
  "status"       TEXT NOT NULL DEFAULT 'queued',
  "total"        INTEGER NOT NULL DEFAULT 0,
  "processed"    INTEGER NOT NULL DEFAULT 0,
  "errors"       JSONB NOT NULL DEFAULT '[]',
  "payload"      JSONB NOT NULL DEFAULT '{}',
  "result_url"   TEXT,
  "created_by"   TEXT NOT NULL,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  CONSTRAINT "BulkJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BulkJob_company_id_idx" ON "BulkJob"("company_id");
CREATE INDEX "BulkJob_created_by_idx" ON "BulkJob"("created_by");
ALTER TABLE "BulkJob" ADD CONSTRAINT "BulkJob_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE;
