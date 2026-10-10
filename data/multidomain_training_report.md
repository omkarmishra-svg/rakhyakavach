# [RAKSHA KAVACH] Multi-Domain Industrial PPE Model Training Report

**Date:** 2026-10-08 20:33:51 UTC  
**Target Domains:** Construction Engineering + Chemical Engineering  
**Architecture:** Ultralytics YOLOv8 Nano (`yolov8n.pt`)  
**Training Epochs:** 2 (Batch Size: 16, Img Size: 320)  
**Compute Device:** CPU (Elapsed: 430.6s)  

## Validation Metrics
- **Precision:** 55.37%
- **Recall:** 25.24%
- **mAP@0.5:** 36.58%
- **mAP@0.5:0.95:** 23.30%

## Expanded 20-Class Multi-Domain Taxonomy
1. **Construction Engineering:** `helmet`, `vest`, `boots`, `gloves`, `goggles`, `safety_harness`, `welding_shield`
2. **Chemical Engineering:** `chemical_suit`, `chemical_respirator`, `chemical_gloves`, `chemical_boots`, `scba`
3. **Absence/Violations:** `no_helmet`, `no_vest`, `no_gloves`, `no_boots`, `no_respirator`, `no_chemical_suit`, `no_harness`

Model checkpoint active at `C:\Users\ASUS\OneDrive\Desktop\rakhyakavach\models\ppe_best.pt`.
