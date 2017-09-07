#!/bin/bash
# Alf 20170628 roll, flip stereo pair for cardboardcamera upload

if [ "$#" -ne 1 ]; then
  echo "Ooops! Pass one paramater, eg. 01 for 01-left.jpg"
  exit
fi

#roll=10
#roll=2688
roll=10
f=$1

ls -l src/$f-left.jpg src/$f-right.jpg

# check things are where we expect them
if [ ! -f src/$f-left.jpg ]; then
 echo src/$f-left.jpg missing, exiting.
 exit 0
fi

if [ ! -f src/$f-right.jpg ]; then
 echo src/$f-right.jpg missing, exiting.
 exit 0
fi

# roll left image by XX pixels
convert -roll +$roll+0 src/$f-left.jpg roll/$f-left.jpg

if [ ! -f roll/$f-left.jpg ]; then
 echo roll/$f-left.jpg missing, exiting.
 exit 0
fi

# make l/r flips

LEFT=$f-left.jpg
RIGHT=$f-right.jpg
EXTENT=5376x2688
CROP=5376x2480

convert roll/$f-left.jpg -extent $EXTENT src/$f-right.jpg mask1-cam.png -crop $CROP+0+0 -gravity East -composite -quality 90 $LEFT
convert roll/$f-left.jpg -extent $EXTENT src/$f-right.jpg mask2-cam.png -crop $CROP+0+0 -gravity East -composite -quality 90 $RIGHT

ls -l $LEFT $RIGHT
