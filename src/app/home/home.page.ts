import { Component, OnInit } from '@angular/core';
import { Clipboard } from '@capacitor/clipboard';
import { PushNotifications, Token } from '@capacitor/push-notifications';
import { AlertController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  standalone:false,
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  
  deviceToken: string = '';
  isTokenLoaded: boolean = false;
  errorMessage: string = '';

  constructor(
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  async ngOnInit() {
    await this.initializePushNotifications();
  }

  async initializePushNotifications() {
    try {
      console.log('بدء إعداد Push Notifications...');
      
      // طلب الإذن للإشعارات
      let permStatus = await PushNotifications.checkPermissions();
      console.log('Permission status:', permStatus);
      
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
        console.log('Permission after request:', permStatus);
      }
      
      if (permStatus.receive !== 'granted') {
        this.errorMessage = 'تم رفض إذن الإشعارات';
        throw new Error('User denied permissions!');
      }

      // تسجيل الجهاز للحصول على Token
      console.log('تسجيل الجهاز...');
      await PushNotifications.register();

      // الاستماع لحدث الحصول على Token
      PushNotifications.addListener('registration', (token: Token) => {
        console.log('تم الحصول على Token:', token.value);
        this.deviceToken = token.value;
        this.isTokenLoaded = true;
        this.showTokenAlert();
      });

      // الاستماع لأخطاء التسجيل
      PushNotifications.addListener('registrationError', (error: any) => {
        console.error('خطأ في التسجيل:', error);
        this.errorMessage = 'فشل في الحصول على Token: ' + JSON.stringify(error);
        this.showErrorAlert(this.errorMessage);
      });

      // الاستماع لاستقبال الإشعارات
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('تم استقبال إشعار:', notification);
        this.showNotificationAlert(notification);
      });

    } catch (error: any) {
      console.error('Push notification setup failed:', error);
      this.errorMessage = 'فشل في إعداد الإشعارات: ' + error.message;
      this.showErrorAlert(this.errorMessage);
    }
  }

  async showTokenAlert() {
    const alert = await this.alertController.create({
      header: '🎉 تم الحصول على Device Token',
      message: `<div style="word-break: break-all; font-family: monospace; font-size: 12px; background: #f5f5f5; padding: 10px; border-radius: 5px;">${this.deviceToken}</div>`,
      buttons: [
        {
          text: '📋 نسخ',
          handler: () => {
            this.copyToken();
          }
        },
        {
          text: '✅ موافق',
          role: 'cancel'
        }
      ]
    });

    await alert.present();
  }

  async copyToken() {
    try {
      await Clipboard.write({
        string: this.deviceToken
      });
      
      const toast = await this.toastController.create({
        message: '✅ تم نسخ Token بنجاح!',
        duration: 3000,
        position: 'bottom',
        color: 'success'
      });
      await toast.present();
    } catch (error) {
      console.error('Failed to copy token:', error);
      const toast = await this.toastController.create({
        message: '❌ فشل في نسخ Token',
        duration: 2000,
        position: 'bottom',
        color: 'danger'
      });
      await toast.present();
    }
  }

  async showErrorAlert(message: string) {
    const alert = await this.alertController.create({
      header: '❌ خطأ',
      message: message,
      buttons: [
        {
          text: '🔄 إعادة المحاولة',
          handler: () => {
            this.refreshToken();
          }
        },
        {
          text: 'موافق',
          role: 'cancel'
        }
      ]
    });

    await alert.present();
  }

  async showNotificationAlert(notification: any) {
    const alert = await this.alertController.create({
      header: '📨 تم استقبال إشعار',
      message: `العنوان: ${notification.title}<br>المحتوى: ${notification.body}`,
      buttons: ['موافق']
    });

    await alert.present();
  }

  async refreshToken() {
    this.isTokenLoaded = false;
    this.deviceToken = '';
    this.errorMessage = '';
    await this.initializePushNotifications();
  }

  async shareToken() {
    if (this.deviceToken) {
      try {
        await (navigator as any).share({
          title: 'FCM Device Token',
          text: this.deviceToken
        });
      } catch (error) {
        // Fallback to copy if share is not supported
        this.copyToken();
      }
    }
  }
}