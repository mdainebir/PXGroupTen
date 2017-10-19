#!/bin/bash
# Alf 20170628 roll, flip stereo pair for cardboardcamera upload

if [ "$#" -ne 2 ]; then
  echo "Ooops! Pass two parameters"
  exit
fi

LEFTSRC=$1
RIGHTSRC=$2

LEFT=out-left.jpg
RIGHT=out-right.jpg
EXTENT=5376x2688
CROP=5376x2480

rm $LEFT
rm $RIGHT

echo converting left $LEFT
#convert $LEFTSRC -extent $EXTENT $RIGHTSRC mask1-cam.png -crop $CROP+0+0 -gravity East -composite -quality 90 $LEFT
convert $LEFTSRC -extent $EXTENT $RIGHTSRC mask1-cam.png -composite -quality 90 $LEFT

echo converting right $RIGHT
convert $LEFTSRC -extent $EXTENT $RIGHTSRC mask2-cam.png -composite -quality 90 $RIGHT
#convert $LEFTSRC -extent $EXTENT $RIGHTSRC mask2-cam.png -crop $CROP+0+0 -gravity East -composite -quality 90 $RIGHT

echo ""

