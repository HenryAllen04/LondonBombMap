# Historical London in 3D: sources, alignment and a practical pilot

Research date: 8 September 2026. Scope: the current Pimlico island prototype, historical buildings around 1944, relevant map indexes and reusable software. This is a feasibility report; the proposed historical layer has not been implemented.

**Yes: historical footprints can become selectable, coloured 3D buildings.** The credible first result would be simple extruded footprints with separately documented height assumptions. A scanned map supplies plan geometry; it does not automatically supply roof shapes, heights or the condition of a building on a particular day. I did not identify a verified, ready-to-import 1944 Pimlico 3D model in the sources reviewed.

The strongest next step is a small historical-footprint layer alongside today's model. Our current limiting factors are source registration, historical identity and dating. A different renderer would not establish those facts.

**What the local benchmark establishes**

Re-ran `node scripts/pimlico-benchmark.mjs` successfully. Its generated result is in [benchmark.json](../public/proto/london-island/benchmark.json). Inspected the trace source, projection helper, registration template and existing validation documents.

| Finding | Evidence | Implication |
| --- | --- | --- |
| Historical shapes are rough groups | Twenty areas in `data/pimlico-traces.json`, drawn in an 1800 × 952 public-viewer coordinate frame | These cannot identify individual houses reliably. |
| Placement is unvalidated | Three approximate garden/bridge anchors; zero independent check points | An affine fit can reproduce its three anchors perfectly without proving accuracy elsewhere. |
| Measured registration is still pending | `data/pimlico-registration.json` has no points or image checksum | There is no measured positional error to report. |
| Modern geometry is modern | 1,688 Overture building records, 1,697 polygon components | Matching a roof today does not establish the identity of a wartime building. |
| Candidate matches are fragile | 68 candidates and 86 partial overlaps; 22 candidates change assignment under at least one deliberate 3 m translation | About 32% of candidates are translation-sensitive. This is a sensitivity experiment, not a measured 3 m error. |
| Height detail is limited | 224 components use supplied heights; 573 use floor-based estimates; 900 use an illustrative 8 m fallback | More than half use the same fallback height. Visual uniformity is partly a data issue. None of these are established wartime heights. |
| Historical accuracy is unknown | Zero verified historical properties and no retained addresses | Counts of matches must not be presented as accuracy or as a count of affected houses. |

The previous tile-fragment/grouping problems have already been addressed in the active Overture pilot. Their older counts in `docs/building-matching.md` are baselines, not the current denominator. The spatial R-tree and intersection matcher already exist; another index may improve scale but cannot fix source placement or historical identity.

The current transform uses approximate longitude/latitude anchors. The planned measurement workflow uses British National Grid. Use a consistent metric coordinate system for registration and comparisons, then convert for display. Do not assume this projection change alone will cure the much larger uncertainties in the source observations.

**Sources worth using, in priority order**

| Source / index | What it offers | Application and limitation |
| --- | --- | --- |
| [London Archives bomb-damage research guide](https://www.thelondonarchives.org/your-research/research-guides/second-world-war-bomb-damage), [sheet index](https://www.londonpicturearchive.org.uk/view-item?i=343492), [our Sheet 88](https://www.londonpicturearchive.org.uk/view-item?i=343662) | Authoritative damage evidence and a way to locate adjoining sheets | Retrace historical sites and damage on the delivered source. Cumulative damage is not a dated incident record. Local order notes say the image is pending. |
| [NLS Map Finder](https://maps.nls.uk/geo/find/) | Geographic discovery of historical OS sheets | Find the nearest pre-war large-scale survey and later comparison sheets for the same block. Capture the individual sheet's survey/revision/publication dates; do not date every sheet from the collection title. |
| [Late Victorian London building footprints, version 1.1](https://zenodo.org/records/20800572) | Roughly 1.3 million automatically extracted footprints from 1891–1896 OS mapping; raw and corrected GeoPackages, EPSG:3857, CC BY 4.0 | Most promising reusable geometry lead. Extract a Pimlico sample and check it against wartime evidence. It is neither a 1944 dataset nor a height model. |
| [Historic England Aerial Photo Explorer](https://historicengland.org.uk/images-books/archive/collections/aerial-photos) | Searchable historical aerial-photo locations; a USAAF collection covering 1943–1944 | Look for date-specific evidence of buildings, clearance and roof form. Exact 1944 Pimlico coverage and usable stereo overlap remain unverified. |
| [Layers of London](https://www.layersoflondon.org/), [IHR's description of its RAF layer](https://www.history.ac.uk/news-events/blogs/layers-london-news-digest-june) | Georeferenced post-war aerial imagery of London | Strong comparison for surviving fabric and cleared sites. It depicts the late 1940s; it cannot alone establish what existed in 1944. Embedding/export rights and endpoints need checking before integration. |
| [National Archives Bomb Census guide](https://www.nationalarchives.gov.uk/help-with-your-research/research-guides/bomb-census-survey-records-1940-1945) | Bomb maps and related incident documentation; map series HO 193 and detailed damage files in HO 192 | Research exact incident dates separately from damage grades. Catalogue discovery does not imply a downloadable vector service. |
| [Bomb Sight](https://bombsight.org/) | Existing digitised bomb-location context | Its stated map coverage is 7 October 1940–6 June 1941. It cannot supply the missing 1944 chronology. |

The Victorian dataset includes a corrected file of approximately 640 MB and notes segmentation problems in small/dense buildings and map-sheet seams. Its advertised detection metrics are not Pimlico validation or positional accuracy. The reviewed record flags a newer version: select and pin a version before extraction. No bulk dataset was downloaded in this report.

NLS direct page access was partly blocked by robots rules during research. Indexed item metadata was available, but an exact suitable Pimlico wartime sheet and a production tile service were not verified. A concrete date trap appears in [London Extension XII.76](https://maps.nls.uk/view/231272889): published 1908, reprinted 1944. This is an example of metadata interpretation, not a recommendation that this sheet covers our pilot.

The [London Archives collection description](https://www.thelondonarchives.org/blog/second-world-war-bomb-damage-maps-of-london) describes 110 sheets at 1:2500, based on 1916 mapping updated to 1940, recording damage during 1940–1945. Consequently, labelling the full damage layer “1944” would overstate its temporal precision.

If “frameworks from 1944” means planning proposals, the same archive description identifies the 1943 County of London Plan and 1944 Greater London Plan. These suggest an interesting future “planned London” overlay, clearly identified as proposals; they are not a survey of buildings standing that year.

**Repositories that can help**

| Repository | Useful capability | Fit for this project |
| --- | --- | --- |
| [Allmaps](https://github.com/allmaps/allmaps), [MapLibre package](https://dev.allmaps.org/docs/packages/maplibre/) | Georeferencing IIIF maps and displaying warped maps | Best candidate to evaluate for an interactive historical raster layer in our existing MapLibre stack. Packages are MIT; app licences differ. Confirm IIIF availability and test compatibility with our pinned MapLibre 6.8.0. It does not extract buildings or heights. |
| [Histo3D](https://github.com/CamilleMorlighem/histo3d) | Historical map processing, footprint subdivision and plausible 3D reconstruction | Closest research implementation to the question. MIT; Python/GRASS/Blender workflow. Its README says macOS was not tested. Treat it as a method to evaluate on a block, with inferred geometry labelled. |
| [Map Warper](https://github.com/timwaters/mapwarper) | Control-point georeferencing and GeoTIFF/WMS/tile exports | Useful authoring alternative for scans. A separate service is more infrastructure than the current pilot needs. |
| [Kartta Labs Map Warper](https://github.com/kartta-labs/mapwarper) | Historical rectification and a workflow linked to map tracing | Useful precedent, but its README lists an old Rails/Ruby stack. Assess dependencies before adopting; it is not a London dataset. |
| [OpenHistoricalMap API discussion](https://forum.openhistoricalmap.org/t/is-there-any-api-for-using-open-historical-map/279) | Historical map styles and date filtering in MapLibre | An additional discovery/integration lead. Pimlico building coverage and source quality were not measured, so it should not be assumed to contain the missing wartime model. |

These capabilities do not require replacing our Three.js island renderer. My recommendation is to use a georeferencing tool for source preparation, retain independently identified historical polygons, and evaluate simple extrusion in the current scene before adding a procedural modelling pipeline.

**What to highlight and how to validate it**

Use separate selectable layers for historical building outlines, reviewed cumulative damage and present-day geometry. A historical building can remain visible even where it was demolished and has no modern counterpart. Dated incidents should be separate records with their own evidence. Estimated heights should be visible in the building inspector; unknown dates should stay unknown.

1. Choose two or three Pimlico blocks, including a surviving terrace and a redeveloped area. Extract the Victorian footprints if coverage permits, otherwise trace the nearest suitable large-scale pre-war sheet.
2. Register the delivered damage image in its native pixel coordinates. Apply the existing proposed gate of 12 distributed fitting landmarks and 8 independent check landmarks, with held-out P95 below half the measured median frontage width. This is our pilot criterion, not an archival standard.
3. Review the existing proposed 30-property sample. Establish historical footprints and identity before assigning damage or linking modern buildings. Include mixed and unresolved cases.
4. Extrude historical polygons with sourced heights where available; otherwise use explicitly illustrative heights. Do not derive a collapsed roof or building height from damage colour alone.
5. Validate footprint placement, historical identity, damage reading and date attribution separately. Report unresolved cases and sensitivity alongside successes.

For expansion, create a sheet catalogue keyed by archive identifier, with coverage geometry, survey/revision/publication dates, image checksum, reuse terms, transform version and held-out error. Historical building IDs should be independent of Overture IDs. Store split/merge/rebuilt/demolished relationships explicitly. A spatial index finds nearby records; this catalogue and evidence crosswalk make the results interpretable.

**Recommended decision:** proceed first with a small, independently rendered historical footprint pilot. The Victorian vectors are the strongest new geometry lead; the delivered LCC sheet supplies damage evidence; dated aerials and incident records resolve chronology. A convincing 1944 reconstruction depends on combining and checking these sources, rather than treating any one collection as a complete model.
