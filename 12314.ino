#include <Wire.h>
#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x27, 18, 2);

// カスタム文字の定義
byte arrow[8] = {
    B00000,
    B00100,
    B00010,
    B11111,
    B00010,
    B00100,
    B00000,
};
byte checkmark[8] = {
    B00001,
    B00001,
    B00010,
    B00010,
    B10100,
    B11100,
    B01000,
    B00000
};
byte info[8] = {
  B00100,
  B00000,
  B01100,
  B00100,
  B00100,
  B00100,
  B01110,
  B00000
};
byte setting[8] = {
  B00010,
  B11111,
  B00010,
  B00000,
  B01000,
  B11111,
  B01000,
  B00000
};
byte book[9] = {
  B11011,
  B10101,
  B10101,
  B10101,
  B10101,
  B11111,
  B00100,
  B00000
};
byte input[8] = {
  B00000,
  B00100,
  B01110,
  B00100,
  B00000,
  B01110,
  B00000,
  B00000
};
byte sun[8] = {
    B00000,
    B10101,
    B01110,
    B11111,
    B01110,
    B10101,
    B00000,
    B00000
};

byte select[8] = {
  B00000,
  B00100,
  B00110,
  B00111,
  B00110,
  B00100,
  B00000,
  B00000
};

const int buttonAPin = 2;
const int buttonBPin = 3;

int currentState = 0;
int currentSelection = 0;
int cScreenState = 0;
int bScreenState = 0;
bool backlightOn = true;
bool firstRun = true;
int counter = 0;

void setup() {
  lcd.init(); // begin() の代わりに init() を使用
  lcd.backlight();
  pinMode(buttonAPin, INPUT_PULLUP);
  pinMode(buttonBPin, INPUT_PULLUP);
  Serial.begin(9600);
  
  // カスタム文字をLCDに登録
  lcd.createChar(0, arrow);
  lcd.createChar(1, checkmark);
  lcd.createChar(2, info);
  lcd.createChar(3, setting);
  lcd.createChar(4, book);
  lcd.createChar(5, input);
  lcd.createChar(6, sun);
  lcd.createChar(7, select);
  
  showHomeScreen();
}

void loop() {
  if (digitalRead(buttonAPin) == HIGH) {
    handleButtonA();
    delay(200); // デバウンス
  }

  if (digitalRead(buttonBPin) == LOW) {
    handleButtonB();
    delay(200); // デバウンス
  }
}

void handleButtonA() {
  switch (currentState) {
    case 0:
      currentSelection = (currentSelection + 1) % 5;
      showHomeScreen();
      break;
    case 1:
      showAScreen();
      break;
    case 2:
      cycleBScreen();
      break;
    case 3:
      cycleCScreen();
      break;
    case 4:
      counter++;
      showDPage();
      break;
    case 5:
      backlightOn = !backlightOn;
      if (backlightOn) {
        lcd.backlight();
      } else {
        lcd.noBacklight();
      }
      showEPage();
      break;
  }
}

void handleButtonB() {
  switch (currentState) {
    case 0:
      if (currentSelection == 0) {
        showAScreen();
      } else if (currentSelection == 1) {
        currentSelection = 0;
        showBPage();
      } else if (currentSelection == 2) {
        currentSelection = 0;
        showCScreen();
      } else if (currentSelection == 3) {
        showDPage();
      } else if (currentSelection == 4) {
        showEPage();
      }
      break;
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
      counter = 0;
      showHomeScreen();
      break;
  }
}

void showHomeScreen() {
  lcd.clear();
  if (firstRun) {
    lcd.setCursor(0, 0);
    lcd.print("HELLO,");
    lcd.setCursor(0, 1);
    lcd.print("WORLD!");
    delay(1000);
    firstRun = false;
  }

  lcd.clear();
  lcd.setCursor(0, 0);
  if (currentSelection == 0){ 
    lcd.write(byte(7));
    lcd.write(byte(2));
    lcd.print(" ");
    lcd.write(byte(3));
    lcd.print(" ");
    lcd.write(byte(4));
    lcd.print(" ");
    lcd.write(byte(5));
    lcd.print(" ");
    lcd.write(byte(6));
  } else if (currentSelection == 1) {
    lcd.print(" ");
    lcd.write(byte(2));
    lcd.write(byte(7));
    lcd.write(byte(3));
    lcd.print(" ");
    lcd.write(byte(4));
    lcd.print(" ");
    lcd.write(byte(5));
    lcd.print(" ");
    lcd.write(byte(6));
  } else if (currentSelection == 2) {
    lcd.print(" ");
    lcd.write(byte(2));
    lcd.print(" ");
    lcd.write(byte(3));
    lcd.write(byte(7));
    lcd.write(byte(4));
    lcd.print(" ");
    lcd.write(byte(5));
    lcd.print(" ");
    lcd.write(byte(6));
  } else if (currentSelection == 3) {
    lcd.print(" ");
    lcd.write(byte(2));
    lcd.print(" ");
    lcd.write(byte(3));
    lcd.print(" ");
    lcd.write(byte(4));
    lcd.write(byte(7));
    lcd.write(byte(5));
    lcd.print(" ");
    lcd.write(byte(6));
  } else if (currentSelection == 4) {
    lcd.print(" ");
    lcd.write(byte(2));
    lcd.print(" ");
    lcd.write(byte(3));
    lcd.print(" ");
    lcd.write(byte(4));
    lcd.print(" ");
    lcd.write(byte(5));
    lcd.write(byte(7));
    lcd.write(byte(6));
  }

  lcd.setCursor(0, 1);
  lcd.print("A:");
  lcd.write(byte(0));  // musictone
  lcd.print(" B:");
  lcd.write(byte(1));  // checkmark
  currentState = 0;
}

void showAScreen() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("ARDUINO");
  lcd.setCursor(0, 1);
  lcd.print("UNO");
  currentState = 1;
}

void showBPage() {
  bScreenState = 0;
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("8656Bytes Used");
  lcd.setCursor(0, 1);
  lcd.print("A:");
  lcd.write(byte(0));  // musictone
  lcd.print(" B:");
  lcd.write(byte(1));  // checkmark
  currentState = 2;
}

void cycleBScreen() {
  bScreenState = (bScreenState + 1) % 4; // Bページのサブページを4つに設定
  lcd.clear();
  if (bScreenState == 0) {
    lcd.print("7446Bytes Used");
    lcd.setCursor(0, 1);
    lcd.print("        (1/4)");
  } else if (bScreenState == 1) {
    lcd.print("I2C 18x2");
    lcd.setCursor(0, 1);
    lcd.print("        (2/4)");
  } else if (bScreenState == 2) {
    lcd.print("arduinoOS 1");
    lcd.setCursor(0, 1);
    lcd.print("        (3/4)");
  } else if (bScreenState == 3) {
    lcd.print("build 0.1 beta");
    lcd.setCursor(0, 1);
    lcd.print("        (4/4)");
  }
  lcd.setCursor(0, 1);
  lcd.print("A:");
  lcd.write(byte(0));  // musictone
  lcd.print(" B:");
  lcd.write(byte(1));  // checkmark
}

void showCScreen() {
  cScreenState = 0;
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("On a dark night,");
  lcd.setCursor(0, 1);
  lcd.print("A:");
  lcd.write(byte(0));  // musictone
  lcd.print(" B:");
  lcd.write(byte(1));  // checkmark
  currentState = 3;
}

void cycleCScreen() {
  cScreenState = (cScreenState + 1) % 18; // Cページのサブページを18に設定
  lcd.clear();
  if (cScreenState == 0) {
    lcd.print("On a dark night,");
    lcd.setCursor(0, 1);
    lcd.print("        (1/18)");
  } else if (cScreenState == 1) {
    lcd.print("in the town,");
    lcd.setCursor(0, 1);
    lcd.print("        (2/18)");
  } else if (cScreenState == 2) {
    lcd.print("walks alone,");
    lcd.setCursor(0, 1);
    lcd.print("        (3/18)");
  } else if (cScreenState == 3) {
    lcd.print("under the moon.");
    lcd.setCursor(0, 1);
    lcd.print("        (4/18)");
  } else if (cScreenState == 4) {
    lcd.print("Shadows whisper,");
    lcd.setCursor(0, 1);
    lcd.print("        (5/18)");
  } else if (cScreenState == 5) {
    lcd.print("secrets untold,");
    lcd.setCursor(0, 1);
    lcd.print("        (6/18)");
  } else if (cScreenState == 6) {
    lcd.print("memories remain,");
    lcd.setCursor(0, 1);
    lcd.print("        (7/18)");
  } else if (cScreenState == 7) {
    lcd.print("of a love lost.");
    lcd.setCursor(0, 1);
    lcd.print("        (8/18)");
  } else if (cScreenState == 8) {
    lcd.print("Hope kept shine,");
    lcd.setCursor(0, 1);
    lcd.print("        (9/18)");
  } else if (cScreenState == 9) {
    lcd.print("new dawn awaits.");
    lcd.setCursor(0, 1);
    lcd.print("        (10/18)");
  } else if (cScreenState == 10) {
    lcd.print("\xcf\xc1\xc3\xde,\xc2\xb7\xb7\xb6\xd8\xc9\xbc\xc0\xa6");
    lcd.setCursor(0, 1);
    lcd.print("        (11/18)");
  } else if (cScreenState == 11) {
    lcd.print("\xcb\xc4\xd8\xb6\xde\xb1\xd9\xb2\xc1\xb2\xc0\xa1");
    lcd.setCursor(0, 1);
    lcd.print("        (12/18)");
  } else if (cScreenState == 12) {
    lcd.print("\xb6\xb9\xde\xb6\xde\xbb\xbb\xd4\xb7,");
    lcd.setCursor(0, 1);
    lcd.print("        (13/18)");
  } else if (cScreenState == 13) {
    lcd.print("\xca\xc5\xbe\xc5\xb6\xaf\xc0\xcb\xd0\xc2");
    lcd.setCursor(0, 1);
    lcd.print("        (14/18)");
  } else if (cScreenState == 14) {
    lcd.print("\xb3\xbc\xc5\xca\xda\xc0\xb5\xd3\xb2\xc3\xde\xb6\xde");
    lcd.setCursor(0, 1);
    lcd.print("        (15/18)");
  } else if (cScreenState == 15) {
    lcd.print("\xc9\xba\xaf\xc3\xb2\xc0\xa1");
    lcd.setCursor(0, 1);
    lcd.print("        (16/18)");
  } else if (cScreenState == 16) {
    lcd.print("\xb7\xce\xde\xb3\xca\xb1\xb6\xd9\xb8\xa4");
    lcd.setCursor(0, 1);
    lcd.print("        (17/18)");
  } else if (cScreenState == 17) {
    lcd.print("\xb1\xc0\xd7\xbc\xb2\xd6\xb1\xb9\xb6\xde\xcf\xaf\xc3\xd9");
    lcd.setCursor(0, 1);
    lcd.print("        (18/18)");
  }
  lcd.setCursor(0, 1);
  lcd.print("A:");
  lcd.write(byte(0));  // musictone
  lcd.print(" B:");
  lcd.write(byte(1));  // checkmark
}

void showDPage() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("COUNT: ");
  lcd.print(counter);
  lcd.setCursor(0, 1);
  lcd.print("A:+ B:");
  lcd.write(byte(1));  // checkmark
  currentState = 4;
}

void showEPage() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("BACKLIGHT:");
  lcd.setCursor(0, 1);
  if (backlightOn) {
    lcd.print("ON");
  } else {
    lcd.print("OFF");
  }
  currentState = 5;
}
