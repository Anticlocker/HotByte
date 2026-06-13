# Duplicate Files Report

This report logs duplicate file contents found during the codebase audit and summarizes how they are addressed.

## Duplicate Files Found

During the hash-based file content scanning, the following identical image files were detected in the backend menu-items upload directory:

1. **Original File:**
   - `backend/public/uploads/menu-items/1779537001586_pexels-zehra-nur-3474677-5193403.jpg`
2. **Duplicate Assets:**
   - `backend/public/uploads/menu-items/1779541094850_pexels-zehra-nur-3474677-5193403.jpg`
   - `backend/public/uploads/menu-items/1779730361196_pexels-zehra-nur-3474677-5193403.jpg`
   - `backend/public/uploads/menu-items/1779734893655_pexels-zehra-nur-3474677-5193403.jpg`

## Rationale & Resolution
- **Why they exist:** These are uploaded menu item images associated with different menu item records. When hotel managers upload the same stock image for different dishes (e.g. burgers, fries), the backend assigns unique timestamps to prevent collision.
- **Action Taken:** Kept as-is. Deleting them from disk would break database foreign key image references for active menu items. A central asset deduplication mechanism is recommended as a future enhancement for the admin upload controller.
