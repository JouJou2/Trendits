# Security Specification for Trendit

## Data Invariants
1. **Products**: Must have a valid category and vendor. Only admins or the product's vendor can edit.
2. **Vendors**: Profiles are public, but only the vendor owner or admin can edit sensitive fields.
3. **Categories**: Publicly readable, admin-only writes.
4. **Orders**: Only the customer who placed the order or an admin can read. Status can only be updated by admins.
5. **CMS Config**: Publicly readable (site-wide settings), admin-only writes.

## The Dirty Dozen Payloads (Logic Breakers)

1. **Identity Spoofing**: Attempt to create a product with a `vendorId` belonging to another user.
2. **Price Manipulation**: Attempt to update a product and lower its price to $0.01 without authorization.
3. **Ghost Field Injection**: Adding a `isVerified: true` field to a user profile or product that doesn't belong to the schema.
4. **State Shortcutting**: Updating an order status from `pending` directly to `delivered` bypassing `processing` and `shipped`.
5. **Orphaned Writes**: Creating a product with a `categoryId` that does not exist.
6. **Resource Poisoning**: Using a 1.5KB string as a document ID.
7. **PII Leakage**: Attempting to read all user orders as a guest.
8. **Admin Privilege Escalation**: A normal user attempting to write to the `cms/config` document.
9. **Bulk Scrape**: A user attempting to list all orders in the system without a filter.
10. **Immutable Field Write**: Attempting to change the `createdAt` timestamp on an existing document.
11. **Inventory Exhaustion**: Attempting to set product stock to -1 or a massive number like 1,000,000,000.
12. **Unauthorized Deletion**: A user attempting to delete a category document.

## Test Runner Plan
We will use a draft set of rules and verify these payloads are blocked.
