import { View, Text, Image, Keyboard, Alert } from "react-native";
import { Input } from "@/components/input";
import {
  ArrowRight,
  AtSign,
  Calendar as IconCalendar,
  MapPin,
  Settings2,
  UserRoundPlus,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { colors } from "@/styles/colors";
import { Button } from "@/components/button";
import { Modal } from "@/components/modal";
import { Calendar } from "@/components/calendar";

import { calendarUtils, DatesSelected } from "@/utils/calendarUtils";
import { DateData } from "react-native-calendars";
import dayjs from "dayjs";
import { GuestEmail } from "@/components/email";
import { validateInput } from "@/utils/validateInput";
import { tripStorage } from "@/storage/trip";
import { router } from "expo-router";
import { tripServer } from "@/server/trip-server";
import Loading from "@/components/loading";
enum StepForm {
  TRIP_DETAILS = 1,
  ADD_EMAIL = 2,
}

enum MODAL {
  NONE = 0,
  CALENDAR = 1,
  GUEST = 2,
}

export default function Index() {
  /* STEPS */
  const [stepForm, setStepForm] = useState(StepForm.TRIP_DETAILS);

  /* MODAL */
  const [showModal, setShowModal] = useState(MODAL.NONE);

  /* DATA */
  const [selectedDates, setSelectedDates] = useState({} as DatesSelected);

  const [destination, setDestination] = useState("");
  const [emailToInvite, setEmailToInvite] = useState("");
  const [emailsToInvite, setEmailsToInvite] = useState<string[]>([]);
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);

  const [isGettingTrip, setIsGettingTrip] = useState(true);

  function isStepDetails() {
    return stepForm === StepForm.TRIP_DETAILS;
  }

  function handleNextStepForm() {
    if (
      destination.trim().length === 0 ||
      !selectedDates.startsAt ||
      !selectedDates.endsAt
    ) {
      return Alert.alert(
        "Detalhes da viagem",
        "Preencha todas as informações da viagem para seguir"
      );
    }

    if (destination.trim().length < 4) {
      return Alert.alert(
        "Detalhes da viagem",
        "O destino deve ter pelo menos 4 caracteres"
      );
    }

    if (isStepDetails()) {
      return setStepForm(StepForm.ADD_EMAIL);
    }

    Alert.alert("Nova Viagem", "Confirmar viagem?", [
      {
        text: "Não",
        style: "cancel",
      },
      {
        text: "Sim",
        onPress: createTrip,
      },
    ]);
  }

  function handleSelectDates(selectedDay: DateData) {
    const dates = calendarUtils.orderStartsAtAndEndsAt({
      startsAt: selectedDates.startsAt,
      endsAt: selectedDates.endsAt,
      selectedDay,
    });

    setSelectedDates(dates);
  }

  function handleRemoveEmailToInvite(emailToRemove: string) {
    setEmailsToInvite((prevState) =>
      prevState.filter((email) => email !== emailToRemove)
    );
  }

  function handleAddEmail() {
    if (!validateInput.email(emailToInvite)) {
      return Alert.alert("Convidado", "E-mail inválido");
    }

    const emailAlreadyExists = emailsToInvite.find(
      (email) => email === emailToInvite
    );

    if (emailAlreadyExists) {
      return Alert.alert("Convidado", "E-mail já foi adicionado");
    }

    setEmailsToInvite((prevState) => [...prevState, emailToInvite]);
    setEmailToInvite("");
  }

  async function saveTrip(tripId: string) {
    try {
      await tripStorage.save(tripId);

      router.navigate(`/trip/${tripId}`);
    } catch (error) {
      Alert.alert(
        "Salvar viagem",
        "Não foi possível salvar o id da viagem no dispositivo"
      );
      console.log(error);
    }
  }

  async function createTrip() {
    try {
      setIsCreatingTrip(true);

      const newTrip = await tripServer.createTrip({
        destination,
        starts_at: dayjs(selectedDates.startsAt?.dateString).toString(),
        ends_at: dayjs(selectedDates.endsAt?.dateString).toString(),
        emails_to_invite: emailsToInvite,
      });

      Alert.alert("Nova viagem", "Viagem criada com sucesso", [
        {
          text: "OK. Continuar.",
          onPress: () => saveTrip(newTrip.tripId),
        },
      ]);
    } catch (error) {
      console.log(error);
      setIsCreatingTrip(false);
    }
  }

  async function getTrip() {
    try {
      const tripId = await tripStorage.get();

      if (!tripId) {
        return setIsGettingTrip(false);
      }

      const trip = await tripServer.getById(tripId);

      if (trip) {
        return router.navigate(`/trip/${trip.id}`);
      }
    } catch (error) {
      setIsGettingTrip(false);
      console.log(error);
    }
  }

  useEffect(() => {
    getTrip();
  }, []);

  if (isGettingTrip) {
    return <Loading />;
  }

  return (
    <View className="flex-1 items-center justify-center px-5">
      <Image
        source={require("@/assets/logo.png")}
        resizeMode="contain"
        className="h-8"
      />
      <Image
        style={{ position: "absolute" }}
        source={require("@/assets/bg.png")}
      />
      <Text className="text-zinc-400 font-regular text-center text-lg mt-3">
        Convide seus amigos e planeje sua{"\n"}próxima viagem!
      </Text>

      <View className="w-full bg-zinc-900 p-4 rounded-lg my-8 border border-zinc-800">
        <Input>
          <MapPin color={colors.zinc[400]} size={20} />
          <Input.Field
            placeholder="Para onde?"
            editable={isStepDetails()}
            value={destination}
            onChangeText={setDestination}
          ></Input.Field>
        </Input>
        <Input>
          <IconCalendar color={colors.zinc[400]} size={20} />
          <Input.Field
            placeholder="Quando?"
            editable={isStepDetails()}
            onFocus={() => Keyboard.dismiss()}
            showSoftInputOnFocus={false}
            onPressIn={() => isStepDetails() && setShowModal(MODAL.CALENDAR)}
            value={selectedDates.formatDatesInText}
          ></Input.Field>
        </Input>

        {!isStepDetails() && (
          <>
            <View className="border-b py-3 border-zinc-800">
              <Button
                variant="secondary"
                onPress={() => setStepForm(StepForm.TRIP_DETAILS)}
              >
                <Button.Title>Alterar local/data</Button.Title>
                <Settings2 color={colors.zinc[200]} size={20} />
              </Button>
            </View>

            <Input>
              <UserRoundPlus color={colors.zinc[400]} size={20} />
              <Input.Field
                placeholder="Quem estará na viagem?"
                autoCorrect={false}
                value={
                  emailsToInvite.length > 0
                    ? `${emailsToInvite.length} pessoa(s) convidada(s)`
                    : ""
                }
                onPress={() => {
                  Keyboard.dismiss();
                  setShowModal(MODAL.GUEST);
                }}
                showSoftInputOnFocus={false}
              ></Input.Field>
            </Input>
          </>
        )}

        <Button onPress={handleNextStepForm} isLoading={isCreatingTrip}>
          <Button.Title>
            {isStepDetails() ? "Continuar" : "Confirmar viagem"}
          </Button.Title>
          <ArrowRight color={colors.lime[950]} size={20} />
        </Button>
      </View>

      <Text className="text-zinc-500 font-regular text-center text-base">
        Ao planejar sua viagem pela plann.er você automaticamento concorda com
        nossos {""}
        <Text className="text-zinc-300 underline">
          termos de uso e políticas de privacidade
        </Text>
      </Text>

      <Modal
        title="Selecionar datas"
        subtitle="Selecione a data de ida e volta da viagem"
        visible={showModal === MODAL.CALENDAR}
        onClose={() => setShowModal(MODAL.NONE)}
      >
        <View className="gap-4 mt-4">
          <Calendar
            onDayPress={handleSelectDates}
            markedDates={selectedDates.dates}
            minDate={dayjs().toISOString()}
          />
          <Button onPress={() => setShowModal(MODAL.NONE)}>
            <Button.Title>Confirmar</Button.Title>
          </Button>
        </View>
      </Modal>

      <Modal
        title="Selecionar convidados"
        subtitle="Os convidados irão receber e-mails para confirmar a participação na viagem"
        visible={showModal === MODAL.GUEST}
        onClose={() => setShowModal(MODAL.NONE)}
      >
        <View className="my-2 flex-wrap gap-2 border-b border-zinc-800 py-5 items-start">
          {emailsToInvite.length > 0 ? (
            emailsToInvite.map((email) => (
              <GuestEmail
                key={email}
                email={email}
                onRemove={() => {
                  handleRemoveEmailToInvite(email);
                }}
              />
            ))
          ) : (
            <Text className="text-zinc-600 text-base font-regular">
              Nenhum e-mail adicionado.
            </Text>
          )}
        </View>

        <View className="gap-4 mt-4">
          <Input variant="secondary">
            <AtSign color={colors.zinc[400]} size={20} />
            <Input.Field
              placeholder="Digite o e-mail do convidado"
              keyboardType="email-address"
              onChangeText={(email) =>
                setEmailToInvite(email.toLocaleLowerCase())
              }
              value={emailToInvite}
              returnKeyType="send"
              onSubmitEditing={handleAddEmail}
            />
          </Input>
          <Button onPress={handleAddEmail}>
            <Button.Title>Convidar</Button.Title>
          </Button>
        </View>
      </Modal>
    </View>
  );
}
