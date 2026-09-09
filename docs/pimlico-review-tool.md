# Pimlico correspondence tool

Open `/proto/london-island/compare/review`, also linked above the compare page.
This local authoring route produces explicit modern objects linked to historical
rows. It does not automatically update the main map.

## Review a row

1. Check the paper against modern geometry. The two plan views share an extent.
   Select a landmark, then use **Pick on paper** and **Pick on modern map** to
   replace its paired positions. New landmarks start excluded. Use surviving
   corners for independent checks; rebuilt sites cannot be fitting/check points.
2. Experiment with east/north offset, rotation and scale. Read check residuals
   separately from fitting residuals. The initial manually picked dots and their
   residuals do not prove property-level accuracy or physical movement of houses.
   Modern coordinates stay fixed when the paper placement changes.
3. Choose a historical row, then select a modern building from the plan or list.
   Try **Whole objects**, **Supplied parts**, or **Named sections**. For a named
   section, focus the building and click at least three boundary corners in the
   modern plan. The boundary is clipped to its parent and exported as a separate
   object, rather than inferred from the damage overlay's intersection.
4. Add each intended target. One row may correspond to several modern objects.
   Give the assignment a name, relationship and evidence. Reviewed assignments
   require a reviewer and notes. Record the assignment, or edit an existing one.
5. Inspect outlines or whole-object fills, and orbit/click the 3D preview to
   identify the named objects. Source heights may be estimates; this preview does
   not establish historical height or prove a section is a separate property.
6. **Save to project** writes `data/pimlico-review.json`. **Download GeoJSON**
   exports the derived FeatureCollection. Record an in-progress assignment before
   saving. Reloading the tool restores the saved configuration and assignments.

## Saved output and adoption

The JSON contains schema version 1, source-image hash and building fingerprints,
landmark pairs, alignment adjustments, evidence, assignments and an embedded
`artifact` FeatureCollection. Each feature has a stable assignment/target ID,
modern geometry, parent component/building ID, optional source part ID, historical
row/category, separately projected historical geometry, review status and evidence.

`paintEligible` requires a reviewed **surviving** correspondence. Rebuilt and
uncertain links remain in the output as site relationships. Overlapping objects
assigned different categories are flagged with `conflicts` and excluded from
painting. Rebuilt/conflicting objects remain neutral in previews; draft fills
illustrate a proposal. Changing alignment returns recorded assignments to draft.
Review them again using **Edit assignment**.

The save endpoint is development-only, accepts a fixed project path, validates
source fingerprints and geometry, and replaces the file atomically. GeoJSON
download remains available independently. The paper reference requires the local
private source screenshot used by the comparison page. The initial saved review
has no assignments; no QA geometry is historical evidence.

After a correspondence is approved, the main renderer can adopt its saved object
geometry and IDs and honour `paintEligible`. Saving alone does not make a human
review label an independently measured accuracy result.
