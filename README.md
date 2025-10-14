flowchart TD
  Start@{ shape: circle, label: "Launch GifVision" }

  subgraph L1 ["Layer 1 Workflow"]
    Upload1["Upload Video"] --> Preview1["Preview + Clip"]
    Preview1 --> Adjust1["Adjustments Panel"]
    Adjust1 -->|Stream A| GenGIF1A["Generate GIF A"]
    Adjust1 -->|Stream B| GenGIF1B["Generate GIF B"]
    GenGIF1A --> Blend1["Blend A + B"]
    GenGIF1B --> Blend1
    Blend1 --> Output1["Layer 1 Output"]
  end

  subgraph L2 ["Layer 2 Workflow"]
    Upload2["Upload Video"] --> Preview2["Preview + Clip"]
    Preview2 --> Adjust2["Adjustments Panel"]
    Adjust2 -->|Stream A| GenGIF2A["Generate GIF A"]
    Adjust2 -->|Stream B| GenGIF2B["Generate GIF B"]
    GenGIF2A --> Blend2["Blend A + B"]
    GenGIF2B --> Blend2
    Blend2 --> Output2["Layer 2 Output"]
  end

  Output1 --> MasterBlend["Master Blend"]
  Output2 --> MasterBlend
  MasterBlend --> FinalGIF["Generate Final GIF"]
  FinalGIF --> Save["Save to Device"]
  FinalGIF --> Share["Share on Social Media"]

  subgraph Adjustments ["Creative Toolkit"]
    Adjust1 --> Quality["Quality & Size"]
    Adjust1 --> Text["Text Overlay"]
    Adjust1 --> ColorTone["Color & Tone"]
    Adjust1 --> Effects["Artistic Filters"]
    Adjust2 --> Quality
    Adjust2 --> Text
    Adjust2 --> ColorTone
    Adjust2 --> Effects
  end

  subgraph Filters["Artistic Filters"]
    Spectrum["Spectrum Pulse"]
    Cycle["Color Cycle"]
    Trails["Motion Trails"]
    Sharpen["Sharpen"]
    Edge["Edge Detect"]
    Negate["Negate Colors"]
    Flip["Flip H/V"]
    Effects --> Spectrum & Cycle & Trails & Sharpen & Edge & Negate & Flip
  end

  Start --> L1
  Start --> L2
