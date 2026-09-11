# Profiles en brightness

De software kent de profielen `normal`, `night`, `away`, `demo` en `fire`. Elk profile bevat idle-layout, brightness, maximum brightness, toegestane event sources/types, idle rotation en wakegedrag.

Brightness-resolutie in `portal/src/engine/profiles.ts`:

1. handmatige brightness of actief schema;
2. display maximum;
3. profile maximum;
4. night brightness;
5. event brightness override als tijdelijke limiet;
6. expliciete temporary override.

De standaard schedule blijft:

```text
07:00 45%
18:00 25%
22:00  8%
00:00  2%
```

Ambient/hybrid zijn modelmatig voorbereid maar hebben geen hardwarebron zolang er geen lichtsensor is.
