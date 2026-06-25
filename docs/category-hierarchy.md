# Unified category hierarchy

OrnaCore stores root categories, subcategories, and deeper levels in the single `categories` table.
Every category may have a nullable `parentId`, allowing an unlimited hierarchy without separate
models or APIs.

## Core fields

- `name`; a globally unique slug is generated automatically by the backend
- optional `parentId`
- short and long descriptions
- primary and Open Graph media references
- `ACTIVE` or `INACTIVE` status
- SEO title and description
- sibling sort order
- soft-delete marker
- created-by and updated-by user references

New categories are always created as `ACTIVE`. Status is changed only through category updates.

## APIs

```text
GET    /api/v1/admin/categories
GET    /api/v1/admin/categories/tree
GET    /api/v1/admin/categories/:id
POST   /api/v1/admin/categories
PATCH  /api/v1/admin/categories/:id
DELETE /api/v1/admin/categories/:id
```

The tree response contains:

- `tree`: nested categories for tree interfaces
- `flat`: every category with `path`, `depth`, and `ancestorIds` for dropdowns

The backend prevents self-parenting and circular hierarchies. A category cannot be deleted while it
has child categories or mapped products.

Products use the `product_category_mappings` junction table and may belong to multiple root or
child categories. Every product must have exactly one primary category; additional mappings support
collections, merchandising, search, and navigation without duplicating product records. The former
`products.category_id`, `subcategories`, and `subcategoryId` fields are migrated into this model.

The admin toolbox supports click or drag-and-drop category images. Development uses local
`uploads/` storage when Cloudinary is not configured; production requires Cloudinary.
