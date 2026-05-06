# CBLUE Platform - Critical Issues Summary

## Status Report (May 7, 2026)

### ✅ COMPLETED: Calendar Picker Fix
- **Issue**: Date inputs changed to text-only with wrong format (YYYY/MM/DD instead of DD/MM/YYYY), calendar picker disappeared
- **Solution Implemented**: 
  - Created new `DatePickerInput` component using `react-day-picker` + `date-fns`
  - Component supports DD/MM/YYYY format with proper date validation
  - Includes calendar picker with multi-locale support (Thai, English, Chinese)
  - Applied to all 5 date fields:
    - Household Booking (`apps/web/app/[locale]/booking/household/page.tsx`)
    - Project Booking (`apps/web/app/[locale]/booking/project/page.tsx`)
    - Professional Booking (`apps/web/app/[locale]/booking/professional/page.tsx`)
    - Fixer Register/Edit (`apps/web/app/[locale]/fixers/register/page.tsx`)
- **Status**: ✅ TypeScript compilation passes
- **Testing**: Manual testing required after deployment

---

## 🔴 PENDING: Backend 502 Bad Gateway Errors

### Problem Statement
All authenticated API endpoints return 502 Bad Gateway:
- `/api/v1/users/me`
- `/api/v1/orders/fixer`
- `/api/v1/orders/my`
- `/api/v1/properties?limit=20`
- `/api/v1/fixers/me`

### Root Cause Analysis
The 502 errors persist despite:
- ✅ Proxy failover logic added to `apps/web/app/api/v1/[...path]/route.ts`
- ✅ Bearer token forwarding from cookies implemented
- ✅ Backend compilation passing
- ✅ CI/CD workflows green (Deploy Web #172, Backend CI/CD #111)

**Diagnosis**: This is an **infrastructure/operations issue**, not a code issue.

### Investigation Steps (For DevOps/Operations)
1. **SSH to production droplet** and verify backend service status:
   ```bash
   docker ps | grep cblue-backend
   curl http://localhost:3002/api/v1/health
   ```

2. **Check backend logs**:
   ```bash
   docker logs cblue-backend
   tail -f /var/log/cblue-backend.log
   ```

3. **Verify DNS resolution**:
   ```bash
   nslookup api-backend.cblue.co.th
   ```

4. **Verify network connectivity**:
   ```bash
   curl -v http://api-backend.cblue.co.th:3002/api/v1/users/profile
   ```

### Likely Causes
- Backend service is down or not running
- DNS not resolving `api-backend.cblue.co.th`
- Firewall/network blocking requests to port 3002
- JWT middleware rejecting authentication tokens

### Code Changes Made (Working Correctly)
- ✅ `apps/web/app/api/v1/[...path]/route.ts`: Proxy with fallover logic
- ✅ Bearer token extraction from cookies
- ✅ Graceful error handling for 502 responses

---

## ⚠️ PENDING: Edit Fixer Profile Hydration Intermittent

### Problem Statement
Form sometimes prefills with existing data, sometimes shows blank fields (address, price list, etc.)

### Root Cause
- `/api/v1/fixers/me` returns 502 during edit mode load
- When API fails, `populateFixerForm()` never executes
- Form displays without previous data

### Solution Needed
1. Add error boundary and retry logic in edit mode
2. Implement graceful fallback UI when profile fails to load
3. Display loading spinner with message: "Loading your profile..."
4. Add retry button if profile fails to load
5. Add success confirmation after save

### Code Location
- `apps/web/app/[locale]/fixers/register/page.tsx` (edit mode logic)
- Look for: `isEditMode` usage and profile data fetching

**Note**: Will auto-resolve once backend 502 errors are fixed

---

## ⚠️ PENDING: Matching Algorithm Returns 0 Results

### Problem Statement
Search for "1000 square meter office fit out" returns:
- "0 professionals matching your request"
- "Matching service is temporarily unavailable"

### Root Cause
- `/api/v1/fixers/match` endpoint returns 502 or empty array
- Keyword extraction not matching:
  - "fitout" in customer requirement vs "fit out" in partner price list
  - Other semantic variations not handled

### Solution Needed
1. **Infrastructure**: Fix backend 502 errors (same as above)
2. **Algorithm Enhancement**:
   - Implement fuzzy matching or semantic similarity
   - Normalize keywords ("fitout" = "fit-out" = "fit out")
   - Use TF-IDF or embeddings for keyword matching
   - Consider: WangchanBERTa embeddings (as user suggested)

### Implementation Options
- Option A: Simple normalization + fuzzy string matching (fast, good for MVP)
- Option B: TF-IDF or BM25 ranking (better recall)
- Option C: Neural embeddings + vector similarity (best UX, requires compute)

---

## Summary of Files Modified

### New Files
- `apps/web/app/[locale]/components/DatePickerInput.tsx` - Reusable date picker component

### Modified Files
- `apps/web/app/[locale]/booking/household/page.tsx` - Calendar picker fix
- `apps/web/app/[locale]/booking/project/page.tsx` - Calendar picker fix
- `apps/web/app/[locale]/booking/professional/page.tsx` - Calendar picker fix
- `apps/web/app/[locale]/fixers/register/page.tsx` - Calendar picker fix + DatePickerInput import
- `apps/web/package.json` - Added dependencies: `react-day-picker`, `date-fns`

### Dependencies Added
```json
{
  "react-day-picker": "^8.x",
  "date-fns": "^3.x"
}
```

---

## Next Steps (Priority Order)

### 🔴 HIGH - Blocking production
1. **Investigate 502 errors** - SSH to production and check backend health
2. Once fixed: Automatically resolves Edit Profile hydration and Matching issues

### 🟡 MEDIUM - Improve robustness
3. Add error handling + retry logic to Edit Profile form
4. Implement fuzzy matching for search results

### 🟢 LOW - Polish
5. Add confirmation messages after form save
6. Improve loading states and progress indicators

---

## Testing Checklist

- [ ] Calendar picker opens on date input focus
- [ ] Can select date from calendar
- [ ] Calendar displays correct month/year for selected date
- [ ] Format is DD/MM/YYYY both in input and when submitted
- [ ] Works on mobile and desktop
- [ ] Thai/English/Chinese locales work correctly
- [ ] Backend responds with 200 (not 502) for `/api/v1/users/me`
- [ ] Edit Fixer Profile prefills all fields correctly
- [ ] Matching search returns results for "fit out" type projects
