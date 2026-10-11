#!/usr/bin/env python3
"""Read user-editable imagegen prompts and verify PNG format without altering pixels."""
import argparse
import json
from pathlib import Path
import sys

SKILL_DIR = Path(__file__).resolve().parent.parent


def load_prompts():
    return json.loads((SKILL_DIR / 'references/prompts.json').read_text())


def prompt_text(stage, class_name='Babarian', features=()):
    prompt = load_prompts()[stage]
    if stage != 'front-base':
        if class_name != 'Babarian' or features:
            raise ValueError('Class and features are permitted only for Front Base')
        return prompt
    if not class_name.strip() or '\n' in class_name or '\r' in class_name:
        raise ValueError('Class must be a nonempty single-line name')
    if class_name != 'Babarian':
        prompt = prompt.replace('barbarian class', f'{class_name} class', 1)
    for feature in features:
        if not feature.strip() or '\n' in feature or '\r' in feature:
            raise ValueError('Each additional feature must be one nonempty line')
        prompt += '\n' + feature
    return prompt


def check_image(image, empty_top_half=False):
    if image.format != 'PNG' or image.mode != 'RGBA':
        raise ValueError('Expected an RGBA PNG')
    if image.width != image.height:
        raise ValueError('Expected a square 1:1 canvas')
    if image.getchannel('A').getextrema() != (0, 255):
        raise ValueError('Expected transparent and opaque alpha pixels')
    if empty_top_half:
        top_height = (image.height + 1) // 2
        top_alpha = image.getchannel('A').crop((0, 0, image.width, top_height))
        if top_alpha.getextrema()[1] != 0:
            raise ValueError('Expected the entire top half to have alpha 0')


def verify(path, empty_top_half=False):
    from PIL import Image
    with Image.open(path) as image:
        check_image(image, empty_top_half)
        layout = '; top half alpha 0 verified' if empty_top_half else ''
        print(f'{path.resolve()}: {image.width}x{image.height} RGBA; transparency verified{layout}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    p = commands.add_parser('prompt')
    p.add_argument('stage', choices=list(load_prompts()))
    p.add_argument('--class-name', default='Babarian')
    p.add_argument('--features', action='append', default=[])
    v = commands.add_parser('verify')
    v.add_argument('path', type=Path)
    v.add_argument('--empty-top-half', action='store_true',
                   help='Require the entire top half to be fully transparent (Downed)')
    args = parser.parse_args()
    try:
        if args.command == 'prompt':
            sys.stdout.write(prompt_text(args.stage, args.class_name, args.features))
        else:
            verify(args.path, args.empty_top_half)
    except (ValueError, OSError, ImportError) as error:
        parser.exit(1, f'{error}\n')


if __name__ == '__main__':
    main()
