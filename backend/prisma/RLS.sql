-- Example Row Level Security policies for the property management database.
-- These policies are commented out. To enable RLS, uncomment and apply via psql after
-- migrations have been run. The application currently enforces scoping at the service
-- layer but these demonstrate how to scope rows to a landlord.

-- Enable RLS on the Property table and restrict access to rows matching the current
-- landlord ID. Set the current landlord ID at the start of each request using
-- `SET app.current_landlord_id = '<id>';` in a connection pool middleware.

-- ALTER TABLE "Property" ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY landlord_isolation ON "Property"
--   USING ("landlordId" = current_setting('app.current_landlord_id'));

-- The Tenancy table references Property via propertyId. Use a WITH CHECK to ensure
-- new rows cannot reference another landlord's property.
-- ALTER TABLE "Tenancy" ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY tenancy_property_match ON "Tenancy"
--   USING ((SELECT "landlordId" FROM "Property" WHERE "Property"."id" = "propertyId") = current_setting('app.current_landlord_id'));

-- Similarly, restrict Ticket access by joining through the Property or Tenancy.
-- ALTER TABLE "Ticket" ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY ticket_landlord_scope ON "Ticket"
--   USING (
--     (SELECT "landlordId" FROM "Property" WHERE "Property"."id" = "propertyId") = current_setting('app.current_landlord_id')
--   );