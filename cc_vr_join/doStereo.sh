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

# check things are where we expect them
if [ -f src/$f-left.JPG ]; then
  LEFTSRC=src/$f-left.JPG
fi
if [ -f src/$f-left.jpg ]; then
  LEFTSRC=src/$f-left.jpg
fi
if [ ! -f $LEFTSRC ]; then  
  echo $LEFTSRC file missing, exiting.
 exit 0
fi

if [ -f src/$f-left.JPG ]; then
  RIGHTSRC=src/$f-right.JPG
fi
if [ -f src/$f-right.jpg ]; then
  RIGHTSRC=src/$f-right.jpg
fi
if [ ! -f $RIGHTSRC ]; then
 echo $RIGHTSRC missing, exiting.
 exit 0
fi

ls -l $LEFTSRC $RIGHTSRC

# roll left image by XX pixels
convert -roll +$roll+0 $LEFTSRC roll/$f-left.jpg

LEFTSRC=roll/$f-left.jpg

if [ ! -f $LEFTSRC ]; then
 echo $LEFTSRC missing, exiting.
 exit 0
fi


# make l/r flips

LEFT=$f-left.jpg
RIGHT=$f-right.jpg
EXTENT=5376x2688
CROP=5376x2480

convert $LEFTSRC -extent $EXTENT $RIGHTSRC mask1-cam.png -crop $CROP+0+0 -gravity East -composite -quality 90 $LEFT
convert $LEFTSRC -extent $EXTENT $RIGHTSRC mask2-cam.png -crop $CROP+0+0 -gravity East -composite -quality 90 $RIGHT

ls -l $LEFT $RIGHT
