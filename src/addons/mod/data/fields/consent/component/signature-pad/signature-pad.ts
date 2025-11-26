// (C) Copyright 2015 Moodle Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { Component, ElementRef, ViewChild, AfterViewInit, forwardRef   } from '@angular/core';
import SignaturePad from 'signature_pad';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'addon-mod-data-field-consent-signaturepad',
  templateUrl: './signature-pad.html',
  styleUrls: ['./signature-pad.css'],
    providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => AddonModDataFieldConsentSignaturePadComponent),
    multi: true,
  }],
})
export class AddonModDataFieldConsentSignaturePadComponent implements AfterViewInit, ControlValueAccessor {

  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private signaturePad!: SignaturePad;
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.adjustCanvasSize(canvas);
    this.signaturePad = new SignaturePad(canvas, { backgroundColor: '#fff', penColor: 'black' });

    // update Angular control when drawing ends
    canvas.addEventListener('mouseup', () => this.updateValue());
    canvas.addEventListener('touchend', () => this.updateValue());
  }

  private adjustCanvasSize(canvas: HTMLCanvasElement) {
    // Get the CSS size
    const style = getComputedStyle(canvas);
    const width = parseInt(style.width, 10);
    const height = parseInt(style.height, 10);

    canvas.width = width;
    canvas.height = height;
  }

  private updateValue() {
    const value = this.signaturePad.isEmpty() ? '' : this.signaturePad.toDataURL('image/png');
    this.onChange(value);
  }

  clear(): void {
    this.signaturePad.clear();
    this.updateValue();
  }

  // ControlValueAccessor methods
  writeValue(value: string): void {
    if (!this.signaturePad) {return;}
    if (value) {
      const image = new Image();
      image.src = value;
      image.onload = () => {
        this.signaturePad.fromDataURL(value);
      };
    } else {
      this.signaturePad.clear();
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

}
