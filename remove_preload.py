import os
import glob

# Remove the unused preload css if it's there
# Actually, the user complains about F12 warnings:
# `The resource https://cblue.co.th/_next/static/css/bdc8353fadd67def.css was preloaded using link preload but not used within a few seconds`
# Next.js injects this automatically. This is a Next.js framework warning for production builds.

