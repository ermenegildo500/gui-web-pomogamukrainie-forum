import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpInterceptor, HttpErrorResponse, HttpEvent } from '@angular/common/http';
import { throwError, Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SnackbarService } from '@app/shared/services';
import { TranslateService } from '@ngx-translate/core';
import { ALERT_TYPES } from '@app/shared/models';
import { AllOffersMapper, offerMapper } from './field-mapper';

interface ApiErrors {
  field: 'string';
  message: string;
  type: 'field' | 'user';
}

@Injectable()
export class HttpErrorInterceptor implements HttpInterceptor {
  constructor(private snackbarService: SnackbarService, private translateService: TranslateService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError((req) => {
        if (req instanceof HttpErrorResponse) {
          this.convertErrorToNotifcation(req);
        }
        return throwError(() => req);
      })
    );
  }

  private convertErrorToNotifcation(req: HttpErrorResponse): void {
    switch (req.status) {
      case 400:
        try {
          const firstError: ApiErrors = (req.error.errors as ApiErrors[])[0];
          // save offer
          if (firstError.type.toLowerCase() === 'field') {
            this.listNotifications(req);
          }
        } catch {
          this.snackbarService.openSnack(
            this.translateService.instant('API_HTTP_ERROR_SERVER_BAD_REQUEST'),
            ALERT_TYPES.ERROR
          );
        }
        break;
      case 401:
      case 403:
        this.snackbarService.openSnack(
          this.translateService.instant('API_HTTP_ERROR_SESSION_OR_PERMISSION'),
          ALERT_TYPES.ERROR
        );
        break;
      case 404:
        try {
          const firstError: ApiErrors = (req.error.errors as ApiErrors[])[0];
          // not found user
          if (firstError.type.toLowerCase() === 'user') {
            this.snackbarService.openSnack(firstError.message, ALERT_TYPES.ERROR);
          }
        } catch {}
        break;
      case 500:
      case 0:
      default:
        this.snackbarService.openSnack(
          this.translateService.instant('API_HTTP_ERROR_SERVER_FAILED_CONNECTION'),
          ALERT_TYPES.ERROR
        );
        break;
    }
  }

  private listNotifications(req: HttpErrorResponse): void {
    const listErrors: ApiErrors[] = (req.error.errors as ApiErrors[]) || [];
    const keysToMap = { ...offerMapper };
    listErrors.map((el) => {
      // for example -> location.city
      const field: string = el.field.includes('.') ? el.field.split('.')[0] : el.field;
      if (keysToMap[field as keyof AllOffersMapper]) {
        const translatedField: string = this.translateService.instant(keysToMap[field as keyof AllOffersMapper]);
        this.snackbarService.openSnack(`${translatedField} ${el.message.toLowerCase()}`, ALERT_TYPES.ERROR);
      }
    });
  }
}
