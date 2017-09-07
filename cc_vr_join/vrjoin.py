#!/usr/bin/env python3
# Alf 20170805 rip the bits from cctoolkit by Andrew Perry

import sys, getopt
import os
import shutil
import tempfile
import base64
from libxmp import XMPFiles, XMPMeta, XMPError
from libxmp.consts import XMP_NS_TIFF
from PIL import Image

XMP_NS_GPHOTOS_IMAGE = u'http://ns.google.com/photos/1.0/image/'
XMP_NS_GPHOTOS_AUDIO = u'http://ns.google.com/photos/1.0/audio/'
XMP_NS_GPHOTOS_PANORAMA = u'http://ns.google.com/photos/1.0/panorama/'

GPANO_PROPERTIES = [
    u'CroppedAreaLeftPixels',
    u'CroppedAreaTopPixels',
    u'CroppedAreaImageWidthPixels',
    u'CroppedAreaImageHeightPixels',
    u'FullPanoWidthPixels',
    u'FullPanoHeightPixels',
    u'InitialViewHeadingDegrees',
]

def _set_xmp_properties(xmp: XMPMeta, namespace: str, prefix: str, **kwargs):
    """
    Takes an XMPMeta instance, an XMP namespace and prefix, and a series
    of keyword arguments. The keyword name/value pairs are added as properties
    to the XMP data. Types are automatically detected (except 'long') so that
    the correct XMPMeta.set_property_* method is used.

    :param xmp: libxmp.XMPMeta
    :param namespace: str
    :param prefix: str
    :param kwargs: dict
    """
    methods = {str: xmp.set_property,
               int: xmp.set_property_int,
               float: xmp.set_property_float,
               datetime: xmp.set_property_datetime,
               bool: xmp.set_property_bool,
               }
    for name, value in kwargs.items():
        func = methods.get(type(value), None)
        if func is not None:
            func(namespace, '%s:%s' % (prefix, name), value)


def get_image_dimensions(img_filepath):
    image = Image.open(img_filepath)
    size = image.size
    image.close()
    return size

def join_vr_image(left_img_filename, right_img_filename, audio_filename=None, output_filepath=None,
                  CroppedAreaLeftPixels=None,
                  CroppedAreaTopPixels=None,
                  CroppedAreaImageWidthPixels=None,
                  CroppedAreaImageHeightPixels=None,
                  FullPanoWidthPixels=None,
                  FullPanoHeightPixels=None,
                  InitialViewHeadingDegrees=None):

    tmp_vr_filename = next(tempfile._get_candidate_names())  # tempfile.NamedTemporaryFile().name
    shutil.copy(left_img_filename, tmp_vr_filename)

    # width, height = get_image_dimensions(tmp_vr_filename)

    if CroppedAreaLeftPixels is None:
        CroppedAreaLeftPixels = 0
    if CroppedAreaTopPixels is None:
        CroppedAreaTopPixels = height
    if CroppedAreaImageWidthPixels is None:
        CroppedAreaImageWidthPixels = width
    if CroppedAreaImageHeightPixels is None:
        CroppedAreaImageHeightPixels = height
    if FullPanoWidthPixels is None:
        FullPanoWidthPixels = width
    if FullPanoHeightPixels is None:
        FullPanoHeightPixels = int(width/2.0)
    if InitialViewHeadingDegrees is None:
        InitialViewHeadingDegrees = 180

    # TODO: if left or right jpg has existing EXIF data, take it (minus the XMP part)
    #       if there is no EXIF data, add some minimal EXIF data
    #       (eg ImageWidth, ImageLength, Orientation, DateTime)
    #
    #       Currently the left image from a split contains more EXIF metadata
    #       (eg Thumbnail fields) since it is derived from the original.
    #       For whatever reason, the GPS location date gets discarded when
    #       we remove the right image + audio from the extended XMP data using
    #       Exempi.

    # Exempi seems to add a xmp:ModifyDate (iso8660 formatted date string)
    # attribute under this namespace xmlns:xmp = "http://ns.adobe.com/xap/1.0/"
    # This isn't found in the Cardboard Camera originals - not sure if it's
    # a problem having it there or not (doesn't seem to matter)

    # TODO: catch XMPError ("bad schema") here
    xmpfile = XMPFiles(file_path=tmp_vr_filename, open_forupdate=True)
    xmp = xmpfile.get_xmp()
    xmp.register_namespace(XMP_NS_GPHOTOS_PANORAMA, 'GPano')
    xmp.register_namespace(XMP_NS_GPHOTOS_IMAGE, 'GImage')
    xmp.register_namespace(XMP_NS_GPHOTOS_AUDIO, 'GAudio')
    xmp.register_namespace(XMP_NS_TIFF, 'tiff')

    xmp.set_properties(XMP_NS_GPHOTOS_PANORAMA,
        'GPano',
        CroppedAreaLeftPixels=CroppedAreaLeftPixels,
        CroppedAreaTopPixels=CroppedAreaTopPixels,
        CroppedAreaImageWidthPixels=CroppedAreaImageWidthPixels,
        CroppedAreaImageHeightPixels=CroppedAreaImageHeightPixels,
        FullPanoWidthPixels=FullPanoWidthPixels,
        FullPanoHeightPixels=FullPanoHeightPixels,
        InitialViewHeadingDegrees=InitialViewHeadingDegrees)

    xmp.set_properties(XMP_NS_TIFF,
        'tiff',
        ImageWidth=width,
        ImageLength=height,
        Orientation=0,
        Make='',
        Model='')

    print('add left image')
    left_img_b64 = None
    with open(left_img_filename, 'rb') as fh:
        left_img_data = fh.read()
    left_img_b64 = base64.b64encode(left_img_data)
    xmp.set_property(XMP_NS_GPHOTOS_IMAGE, u'GImage:Mime', 'image/jpeg')
    xmp.set_property(XMP_NS_GPHOTOS_IMAGE, u'GImage:Data', left_img_b64.decode('utf-8'))
    del left_img_b64
    # gc.collect()

    print('add right image')
    right_img_b64 = None
    with open(right_img_filename, 'rb') as fh:
        right_img_data = fh.read()
    right_img_b64 = base64.b64encode(right_img_data)
    xmp.set_property(XMP_NS_GPHOTOS_IMAGE, u'GImage:Mime', 'image/jpeg')
    xmp.set_property(XMP_NS_GPHOTOS_IMAGE, u'GImage:Data', right_img_b64.decode('utf-8'))
    del right_img_b64
    # gc.collect()

    if audio_filename is not None:
        audio_b64 = None
        with open(audio_filename, 'rb') as fh:
            audio_data = fh.read()
        audio_b64 = base64.b64encode(audio_data)
        xmp.set_property(XMP_NS_GPHOTOS_AUDIO, u'GAudio:Mime', 'audio/mp4a-latm')
        xmp.set_property(XMP_NS_GPHOTOS_AUDIO, u'GAudio:Data', audio_b64.decode('utf-8'))
        del audio_b64
        # gc.collect()

    if xmpfile.can_put_xmp(xmp):
        xmpfile.put_xmp(xmp)
    xmpfile.close_file()

    print('rename temp file')

    if output_filepath is None:
        vr_filepath = path.join(upload_dir(), '%s.vr.jpg' % get_hash_id(tmp_vr_filename))
    else:
        vr_filepath = output_filepath

    shutil.move(tmp_vr_filename, vr_filepath)

    return vr_filepath

def main(argv):
    leftFile = ''
    rightFile = ''
    helpInfo = '[insert help/info text here]'

    try:
        opts, args = getopt.getopt(argv,"hl:r", ["left=","right="])
    except getopt.GetoptError:
        print(helpInfo)
        sys.exit(2)

    for opt, arg in opts:
        if opt == '-h':
           print(helpInfo)
           sys.exit()
        elif opt in ("-l", "--left"):
           leftFile = arg
        elif opt in ("-r", "--right"):
           rightFile = arg

    print('left=', leftFile, 'right=', rightFile)
    print('call join_vr_image')
    join_vr_image( leftFile, rightFile, '' , 'output.vr.jpg', 0, 0, 5376, 2480, 5376, 2688 );

if __name__ == "__main__":
    main(sys.argv[1:])
