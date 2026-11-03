#!/bin/bash
# Generates premium real-estate photography for the Vasati marketplace
cd /home/z/my-project/public/images || exit 1
mkdir -p properties

gen() {
  local prompt="$1" out="$2" size="$3"
  if [ -s "$out" ]; then echo "SKIP $out" >> /tmp/imggen.status; return 0; fi
  for attempt in 1 2 3; do
    if z-ai image -p "$prompt" -o "$out" -s "$size" >> /tmp/imggen.log 2>&1; then
      echo "OK $out" >> /tmp/imggen.status
      return 0
    fi
    sleep $((attempt * 5))
  done
  echo "FAIL $out" >> /tmp/imggen.status
}

# ---------- Wave 1 ----------
gen "Luxury modern residential apartment tower at golden hour dusk, warm lights glowing in windows, manicured landscaped gardens with palm trees and water features, premium architectural photography, dramatic warm sky, photorealistic, ultra high quality" "hero.png" "1440x720" &
gen "Elegant modern Indian apartment living room interior, warm neutral beige and cream tones, linen sofa, teak wood flooring, floor to ceiling windows with soft natural light, indoor plants, premium interior design photography, photorealistic, high quality" "properties/ap-living.png" "1344x768" &
gen "Modern luxury apartment kitchen with quartz countertop, sleek wooden cabinets, marble backsplash, brass pendant lights, premium interior design magazine photography, photorealistic, high quality" "properties/ap-kitchen.png" "1344x768" &
gen "Serene master bedroom in a luxury Indian apartment, king bed with upholstered linen headboard, warm bedside lamps, sheer curtains with morning light, wooden floor, premium interior photography, photorealistic, high quality" "properties/ap-bedroom.png" "1344x768" &
gen "Apartment balcony with sweeping city skyline view at dusk, comfortable outdoor lounge chairs, potted plants, warm ambient lighting, premium real estate photography, photorealistic, high quality" "properties/ap-balcony.png" "1344x768" &
wait

# ---------- Wave 2 ----------
gen "Modern residential apartment complex exterior in India, contemporary architecture with glass balconies and warm stone cladding, landscaped entrance with water feature, clear sky, premium real estate photography, photorealistic, high quality" "properties/ap-building.png" "1344x768" &
gen "Contemporary luxury villa exterior in India, white and natural stone facade, lush green lawn, stone driveway, warm evening lighting, architectural photography, photorealistic, high quality" "properties/villa-ext.png" "1344x768" &
gen "Luxurious double height living room in a modern villa, statement chandelier, floor to ceiling windows overlooking a private garden, elegant designer furniture, premium interior photography, photorealistic, high quality" "properties/villa-int.png" "1344x768" &
gen "Elegant independent house facade in South India, modern tropical architecture, covered porch, garden with frangipani trees, bright daylight, architectural photography, photorealistic, high quality" "properties/house-ext.png" "1344x768" &
gen "Residential land plot with young trees and greenery, clearly marked boundaries with white posts, blue sky with soft clouds, developing premium neighborhood in background, real estate photography, photorealistic, high quality" "properties/plot.png" "1344x768" &
wait

# ---------- Wave 3 ----------
gen "Aerial view of a premium residential township in India, multiple modern towers, central park, clubhouse and swimming pool, landscaped internal roads, golden hour light, architectural visualization, photorealistic, high quality" "properties/township.png" "1344x768" &
gen "Modern residential clubhouse lounge interior, double height ceiling, warm wood and natural stone finishes, elegant seating arrangement, indoor plants, soft warm lighting, premium architectural photography, photorealistic, high quality" "properties/clubhouse.png" "1344x768" &
gen "Resort style swimming pool at a luxury residential complex in India, turquoise water, wooden sun loungers, tall palm trees, evening ambient lighting, premium real estate photography, photorealistic, high quality" "properties/pool.png" "1344x768" &
gen "Premium residential project facade, contemporary Indian architecture, vertical gardens, glass railings, grand double height entrance lobby, dusk lighting, architectural photography, photorealistic, high quality" "properties/facade.png" "1344x768" &
gen "Modern apartment bathroom with freestanding bathtub, marble tiles, brass fixtures, large window with natural light, eucalyptus arrangement, premium interior photography, photorealistic, high quality" "properties/ap-bathroom.png" "1344x768" &
wait

echo "DONE" >> /tmp/imggen.status
