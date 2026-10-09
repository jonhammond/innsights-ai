import { Feather } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Property } from "../lib/properties";
import { fonts, radius, type } from "../theme/tokens";
import { useTheme } from "../theme/useTheme";
import { Button } from "./Button";

type Props = {
  visible: boolean;
  properties: Property[];
  selectedIds: Set<string>;
  onChange: (next: Set<string>) => void;
  onClose: () => void;
};

export function PropertyPicker({ visible, properties, selectedIds, onChange, onClose }: Props) {
  const { t } = useTheme();
  const toggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.center}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close property picker"
          onPress={onClose}
          style={[StyleSheet.absoluteFill, styles.backdrop]}
        />
        <View
          style={[
            styles.sheet,
            { backgroundColor: t.bg.panel, borderColor: t.border.row },
          ]}
        >
          <View style={styles.header}>
            <Text style={[type.label14, { color: t.text.primary, flex: 1 }]}>Properties</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => onChange(new Set(properties.map((p) => p.id)))}
            >
              <Text style={[styles.link, { color: t.accent.link }]}>All</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => onChange(new Set())}>
              <Text style={[styles.link, { color: t.accent.link }]}>None</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.list}>
            {properties.map((p) => {
              const on = selectedIds.has(p.id);
              return (
                <Pressable
                  key={p.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  onPress={() => toggle(p.id)}
                  style={[styles.row, { borderColor: t.border.row }]}
                >
                  <Feather
                    name={on ? "check-square" : "square"}
                    size={18}
                    color={on ? t.accent.blue : t.text.subtle}
                  />
                  <View style={styles.rowText}>
                    <Text style={[type.body13, { color: t.text.primary }]}>{p.name}</Text>
                    <Text style={[type.small12, { color: t.text.dim }]}>
                      {p.location} · {p.total_rooms} rooms
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.footer}>
            <Button label="Done" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  backdrop: { backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "80%",
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 14 },
  link: { fontFamily: fonts.sans500, fontSize: 13 },
  list: { flexGrow: 0 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  rowText: { flex: 1 },
  footer: { flexDirection: "row", justifyContent: "flex-end", paddingTop: 4 },
});
